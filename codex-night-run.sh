#!/usr/bin/env bash
set -u

# Run directly or from another directory: ./codex-night-run.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${ROOT_DIR:-$SCRIPT_DIR}"
RETRY_SECONDS="${RETRY_SECONDS:-1800}"
MODEL="${MODEL:-gpt-5.4}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.codex-logs/night-run}"
BASE_BRANCH="${BASE_BRANCH:-}"
PLAN_DONE_PATTERN="${PLAN_DONE_PATTERN:-^[[:space:]]*ALL TASKS DONE[[:space:]]*$}"
PLAN_FILE_GLOB="${PLAN_FILE_GLOB:-plan-[0-9][0-9]-*.md}"
PLAN_DIR="${PLAN_DIR:-}"

PLAN_FILE_LIST=()

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR" || exit 1

detect_plan_dir() {
  if [[ -n "$PLAN_DIR" ]]; then
    printf "%s\n" "$PLAN_DIR"
    return 0
  fi

  if [[ -d "app/plans" ]]; then
    printf "%s\n" "app/plans"
    return 0
  fi

  if [[ -d "plans" ]]; then
    printf "%s\n" "plans"
    return 0
  fi

  return 1
}

detect_base_branch() {
  if [[ -n "$BASE_BRANCH" ]]; then
    printf "%s\n" "$BASE_BRANCH"
    return 0
  fi

  if git show-ref --verify --quiet "refs/heads/development"; then
    printf "%s\n" "development"
    return 0
  fi

  if git show-ref --verify --quiet "refs/heads/main"; then
    printf "%s\n" "main"
    return 0
  fi

  if git show-ref --verify --quiet "refs/heads/master"; then
    printf "%s\n" "master"
    return 0
  fi

  git branch --show-current
}

refresh_plan_files() {
  local detected_plan_dir

  PLAN_FILE_LIST=()

  if [[ -n "${PLAN_FILES:-}" ]]; then
    # PLAN_FILES is intentionally space-separated for easy CLI overrides.
    read -r -a PLAN_FILE_LIST <<< "$PLAN_FILES"
    return 0
  fi

  if ! detected_plan_dir="$(detect_plan_dir)"; then
    echo "[$(date --iso-8601=seconds)] no plan directory found; set PLAN_DIR or PLAN_FILES"
    return 1
  fi

  PLAN_DIR="$detected_plan_dir"
  mapfile -t PLAN_FILE_LIST < <(
    find "$PLAN_DIR" -maxdepth 1 -type f -name "$PLAN_FILE_GLOB" ! -name "plan-00-*" | sort
  )

  if [[ "${#PLAN_FILE_LIST[@]}" -eq 0 ]]; then
    echo "[$(date --iso-8601=seconds)] no plans matched $PLAN_DIR/$PLAN_FILE_GLOB"
    return 1
  fi

  return 0
}

format_plan_files() {
  printf "%s " "${PLAN_FILE_LIST[@]}"
}

plan_done() {
  local plan_file="$1"

  [[ -f "$plan_file" ]] && grep -Eq "$PLAN_DONE_PATTERN" "$plan_file"
}

all_target_plans_done() {
  local has_plan=false plan_file

  for plan_file in "${PLAN_FILE_LIST[@]}"; do
    has_plan=true
    if [[ ! -f "$plan_file" ]]; then
      return 1
    fi
    if ! plan_done "$plan_file"; then
      return 1
    fi
  done

  if [[ "$has_plan" == false ]]; then
    return 1
  fi

  return 0
}

select_next_plan() {
  local plan_file

  for plan_file in "${PLAN_FILE_LIST[@]}"; do
    if [[ ! -f "$plan_file" ]]; then
      echo "[$(date --iso-8601=seconds)] missing plan file: $plan_file" >&2
      return 1
    fi
    if ! plan_done "$plan_file"; then
      printf "%s\n" "$plan_file"
      return 0
    fi
  done

  return 1
}

plan_branch() {
  local branch_name plan_file base_name

  plan_file="$1"
  branch_name="$(sed -nE 's/^Branch:[[:space:]]*(night\/[A-Za-z0-9._\/-]+).*/\1/p' "$plan_file" | head -n 1)"
  if [[ -n "$branch_name" ]]; then
    printf "%s\n" "$branch_name"
    return 0
  fi

  base_name="$(basename "$plan_file" .md)"
  printf "night/%s\n" "$base_name"
}

ensure_plan_branch() {
  local plan_file target_branch current_branch

  plan_file="$1"
  target_branch="$2"
  current_branch="$(git branch --show-current)"

  if [[ "$current_branch" == "$target_branch" ]]; then
    return 0
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "[$(date --iso-8601=seconds)] refusing to switch from $current_branch to $target_branch with uncommitted changes"
    git status --short
    return 1
  fi

  if git show-ref --verify --quiet "refs/heads/$target_branch"; then
    echo "[$(date --iso-8601=seconds)] switching to existing branch $target_branch for $plan_file"
    git switch "$target_branch"
    return $?
  fi

  BASE_BRANCH="$(detect_base_branch)"
  if ! git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
    echo "[$(date --iso-8601=seconds)] base branch not found: $BASE_BRANCH"
    return 1
  fi

  echo "[$(date --iso-8601=seconds)] creating branch $target_branch from $BASE_BRANCH for $plan_file"
  git switch -c "$target_branch" "$BASE_BRANCH"
}

exit_if_all_target_plans_done() {
  local suffix="$1"

  if ! all_target_plans_done; then
    return 1
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "[$(date --iso-8601=seconds)] all target plans are marked done$suffix, but the working tree has uncommitted changes"
    git status --short
    exit 1
  fi

  echo "[$(date --iso-8601=seconds)] all target plans are done$suffix: $(format_plan_files)"
  exit 0
}

run_codex_once() {
  local current_plan target_branch started_at log_file

  current_plan="$1"
  target_branch="$2"
  started_at="$(date +"%Y%m%d-%H%M%S")"
  log_file="$LOG_DIR/codex-$started_at.log"

  cat <<EOF | tee -a "$log_file"
[$(date --iso-8601=seconds)] starting Codex night-run attempt
root: $ROOT_DIR
model: $MODEL
retry_seconds: $RETRY_SECONDS
plan_dir: ${PLAN_DIR:-from PLAN_FILES}
plan_files: $(format_plan_files)
current_plan: $current_plan
target_branch: $target_branch
branch: $(git branch --show-current)
EOF

  codex --ask-for-approval never exec \
    --cd "$ROOT_DIR" \
    --model "$MODEL" \
    --sandbox workspace-write \
    --ephemeral \
    - <<EOF 2>&1 | tee -a "$log_file"
Continue the local night-run work in this repository.

Current plan file: $current_plan
Current plan branch: $target_branch

Mandatory instructions:
1. Read ${PLAN_DIR:-the plan directory}/ before making changes.
2. Read dev_readme-eslint.md before making changes.
3. Read commit-naming.md before committing.
4. Treat all three as mandatory project instructions.
5. Work only on the current plan file in this chat.
6. Verify the earlier target plans are complete, then continue from the first unfinished [ ] task in the current plan.
7. The runner already selected the branch for this plan. Stay on the current branch unless the plan explicitly requires a merge/rebase into this branch.
8. Complete tasks in the current plan in order unless a task explicitly depends on another.
9. After each completed task, run the required lint/check from the plan and fix violations.
10. Commit after each completed task using the commit message requested by that plan.
11. Commit messages must follow commit-naming.md: type: message, one line, lowercase message, no period, no scope, no body. Allowed types only: fix, upd, style, docs, feat, chore. If a plan asks for a scoped message like fix(cart): ..., convert it to the simple-prefix form.
12. Never push. Never touch .env* files.
13. If the session/time limit stops you, leave the repo in the safest committed state possible; this script will retry after 30 minutes.
14. When every task in the current plan is complete, mark every task [x], append a standalone final line exactly ALL TASKS DONE, commit that plan update if needed, then stop.
15. Do not start the next plan in this chat. The runner will create/use the next plan branch and start a fresh chat.

EOF

  return "${PIPESTATUS[0]}"
}

while true; do
  if ! refresh_plan_files; then
    exit 1
  fi

  exit_if_all_target_plans_done ""

  if ! current_plan="$(select_next_plan)" || [[ -z "$current_plan" ]]; then
    echo "[$(date --iso-8601=seconds)] no incomplete plan could be selected"
    exit 1
  fi

  target_branch="$(plan_branch "$current_plan")"
  if ! ensure_plan_branch "$current_plan" "$target_branch"; then
    echo "[$(date --iso-8601=seconds)] could not prepare branch $target_branch for $current_plan"
    exit 1
  fi

  run_codex_once "$current_plan" "$target_branch"
  codex_exit=$?

  exit_if_all_target_plans_done " after Codex attempt"

  echo "[$(date --iso-8601=seconds)] Codex exited with code $codex_exit; retrying in $RETRY_SECONDS seconds"
  sleep "$RETRY_SECONDS"
done
