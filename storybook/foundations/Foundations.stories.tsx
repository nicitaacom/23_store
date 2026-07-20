import type { Meta, StoryObj } from "@storybook/nextjs-vite";

function SectionHeading({ children }: { children: string }) {
  return <h2 className="font-secondary text-lg font-semibold text-title">{children}</h2>;
}

function ColorSwatch({ className, label, token }: { className: string; label: string; token: string }) {
  return (
    <div className="rounded border border-border-color bg-background p-2">
      <div className={`h-12 rounded border border-border-color ${className}`} />
      <p className="mt-2 text-sm font-semibold text-title">{label}</p>
      <p className="font-mono text-[11px] text-subTitle">{token}</p>
    </div>
  );
}

function ColorPanel({ dark, title }: { dark?: boolean; title: string }) {
  return (
    <section className={`${dark ? "dark" : ""} rounded border border-border-color bg-background p-3`}>
      <SectionHeading>{title}</SectionHeading>
      <div className="mt-3 grid grid-cols-2 gap-2 tablet:grid-cols-4">
        <ColorSwatch className="bg-brand" label="Brand" token="--brand" />
        <ColorSwatch className="bg-background" label="Background" token="--background" />
        <ColorSwatch className="bg-foreground" label="Foreground" token="--foreground" />
        <ColorSwatch className="bg-foreground-accent" label="Foreground accent" token="--foreground-accent" />
        <ColorSwatch className="bg-title" label="Title" token="--title" />
        <ColorSwatch className="bg-subTitle" label="Subtitle" token="--subTitle" />
        <ColorSwatch className="bg-info" label="Information" token="--info" />
        <ColorSwatch className="bg-warning" label="Warning" token="--warning" />
        <ColorSwatch className="bg-danger" label="Danger" token="--danger" />
        <ColorSwatch className="bg-success" label="Success" token="--success" />
        <ColorSwatch className="bg-success-accent" label="Success accent" token="--success-accent" />
        <ColorSwatch className="bg-modal-surface" label="Modal surface" token="--modal-surface" />
      </div>
    </section>
  );
}

function ColorTokens() {
  return (
    <div className="grid gap-3 p-3 desktop:grid-cols-2">
      <ColorPanel title="Light tokens" />
      <ColorPanel dark title="Dark tokens" />
    </div>
  );
}

function TypographyScale() {
  return (
    <div className="grid gap-3 p-3 tablet:grid-cols-2">
      <section className="rounded border border-border-color bg-foreground/5 p-3">
        <SectionHeading>Inter · primary</SectionHeading>
        <div className="mt-3 grid gap-2 font-primary text-title">
          <p className="text-[10px] text-title">10px · metadata and micro-labels</p>
          <p className="text-xs text-title">12px · helper text and badges</p>
          <p className="text-sm text-title">14px · secondary body and table rows</p>
          <p className="text-base text-title">16px · primary body copy</p>
          <p className="text-lg text-title">18px · lead copy</p>
        </div>
      </section>
      <section className="rounded border border-border-color bg-foreground/5 p-3">
        <SectionHeading>Sora · secondary</SectionHeading>
        <div className="mt-3 grid gap-2 font-secondary text-title">
          <p className="text-xl font-medium text-title">20px · section title</p>
          <p className="text-2xl font-semibold text-title">24px · page heading</p>
          <p className="text-3xl font-bold text-title">30px · display heading</p>
        </div>
      </section>
    </div>
  );
}

function SpacingAndRadius() {
  return (
    <div className="grid gap-3 p-3 tablet:grid-cols-2">
      <section className="rounded border border-border-color bg-foreground/5 p-3">
        <SectionHeading>Spacing</SectionHeading>
        <div className="mt-3 grid gap-2">
          <div className="h-3 w-1 bg-brand" aria-label="4 pixels" role="img" />
          <div className="h-3 w-2 bg-brand" aria-label="8 pixels" role="img" />
          <div className="h-3 w-3 bg-brand" aria-label="12 pixels" role="img" />
          <div className="h-3 w-4 bg-brand" aria-label="16 pixels" role="img" />
          <div className="h-3 w-6 bg-brand" aria-label="24 pixels" role="img" />
          <div className="h-3 w-8 bg-brand" aria-label="32 pixels" role="img" />
        </div>
      </section>
      <section className="rounded border border-border-color bg-foreground/5 p-3">
        <SectionHeading>Radius</SectionHeading>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-subTitle">
          <div><div className="h-12 border border-brand bg-brand/10" /><span>none</span></div>
          <div><div className="h-12 rounded-sm border border-brand bg-brand/10" /><span>sm · 6</span></div>
          <div><div className="h-12 rounded border border-brand bg-brand/10" /><span>base · 8</span></div>
          <div><div className="h-12 rounded-lg border border-brand bg-brand/10" /><span>lg · 10</span></div>
          <div><div className="h-12 rounded-xl border border-brand bg-brand/10" /><span>xl · 12</span></div>
          <div><div className="h-12 rounded-2xl border border-brand bg-brand/10" /><span>2xl · 14</span></div>
          <div><div className="h-12 rounded-3xl border border-brand bg-brand/10" /><span>3xl · 16</span></div>
          <div><div className="h-12 rounded-full border border-brand bg-brand/10" /><span>full</span></div>
        </div>
      </section>
    </div>
  );
}

function AppearanceStates() {
  return (
    <div className="grid gap-3 p-3 tablet:grid-cols-2">
      <section className="rounded border border-border-color bg-foreground/5 p-3">
        <SectionHeading>Borders and depth</SectionHeading>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded border border-border-color bg-background p-3 text-sm text-title">Standard border</div>
          <div className="rounded border border-border-color/35 bg-foreground/5 p-3 text-sm text-title">Quiet border</div>
          <div className="rounded bg-modal-surface p-3 shadow-compact text-sm text-title">Compact shadow</div>
          <div className="rounded bg-modal-surface p-3 shadow-compact-lg text-sm text-title">Large compact shadow</div>
        </div>
      </section>
      <section className="rounded border border-border-color bg-foreground/5 p-3">
        <SectionHeading>Focus and disabled</SectionHeading>
        <div className="mt-3 grid gap-3">
          <button className="h-8 rounded border border-brand bg-background px-3 text-sm text-title outline-none ring-2 ring-brand ring-offset-2 ring-offset-background">
            Visible keyboard focus
          </button>
          <button disabled className="h-8 cursor-not-allowed rounded border border-border-color bg-foreground/20 px-3 text-sm text-subTitle opacity-50">
            Disabled control
          </button>
        </div>
      </section>
    </div>
  );
}

function ResponsiveBreakpoints() {
  return (
    <div className="p-3">
      <section className="rounded border border-border-color bg-foreground/5 p-3">
        <SectionHeading>Responsive breakpoints</SectionHeading>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="rounded border border-border-color bg-background p-2 text-title">320px · compact mobile viewport</div>
          <div className="rounded border border-border-color bg-background p-2 text-title">414px · large mobile viewport</div>
          <div className="rounded border border-brand bg-brand/10 p-2 text-title">415px · mobile min-width</div>
          <div className="rounded border border-brand bg-brand/10 p-2 text-title">768px · tablet min-width</div>
          <div className="rounded border border-brand bg-brand/10 p-2 text-title">1024px · laptop min-width</div>
          <div className="rounded border border-brand bg-brand/10 p-2 text-title">1440px · desktop min-width</div>
          <div className="rounded border border-border-color bg-background p-2 text-title">1920px · wide desktop viewport</div>
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: "Foundations/Design tokens",
  component: ColorTokens,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ColorTokens>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {};
export const Typography: Story = { render: TypographyScale };
export const SpacingRadius: Story = { render: SpacingAndRadius };
export const BordersShadowsFocusDisabled: Story = { render: AppearanceStates };
export const Breakpoints: Story = { render: ResponsiveBreakpoints };
