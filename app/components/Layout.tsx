export function Layout ({children}:{children:React.ReactNode}) {
return (
    <div className="bg-background text-title
        min-h-screen transition-colors duration-300 pt-[62px]">
      {children}
    </div>
)
}