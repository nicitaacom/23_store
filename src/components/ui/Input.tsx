import type { ChangeEvent } from "react";

interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type?: string;
  value: string | number | undefined;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function Input({ type, value, onChange, ...props }: InputProps) {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      const inputValue = e.target.value
      const firstChar = inputValue.charAt(0)
      if (
        firstChar === "0" &&
        inputValue.length > 1 &&
        !inputValue.includes(".")
      ) {
        return;
      }
    }

    onChange(e);
  };

  return (
    <input
      className={`w-full rounded border-[1px] border-solid border-secondary bg-transparent px-4 py-2 outline-none`}
      type={type}
      inputMode={type === "number" ? "numeric" : undefined}
      value={value}
      onChange={handleInputChange}
      {...props}
    />
  );
}
