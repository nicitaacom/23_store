import type { ChangeEvent } from "react";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type?: string;
  value: string | number | undefined;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  className?: string
  startIcon?: React.ReactElement
}

export function Input({ type, value, onChange, className, startIcon, ...props }: InputProps) {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      const inputValue = e.target.value;
      const firstChar = inputValue.charAt(0);
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
    <div className={`relative ${className}`}>
      <div className="absolute top-[50%] translate-y-[-50%] translate-x-[50%]">
        {startIcon}
      </div>
      <input
        className={twMerge(`w-full rounded border-[1px] border-solid bg-transparent px-4 py-2 outline-none 
        ${startIcon && 'pl-10'}`)}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={handleInputChange}
        {...props}
      />
    </div>
  );
}
