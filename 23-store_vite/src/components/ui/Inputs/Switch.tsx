interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isChecked: boolean
  onChange: () => void
}

export function Switch({ isChecked = false, onChange, ...props }: SwitchProps) {
  return (
    <label
      className="relative w-[36px] h-[20px] border-[3px] border-icon-color hover:brightness-75 transition-all duration-300 
    rounded-full cursor-pointer mx-1">
      <input
        className="hidden peer/input"
        type="checkbox"
        id="check"
        checked={isChecked}
        onChange={onChange}
        {...props}
      />
      <span
        className={`absolute rounded-full
      w-[10px] h-[10px] translate-x-[20%] translate-y-[20%] bg-icon-color transition-all duration-500
      before:absolute before:content-['']
      peer-checked/input:translate-x-[180%]`}
      />
    </label>
  )
}
