### components/ui folder usage

/ - for root components<br/>
/Navbar - for navbar and nested in navbar components<br/>
/ui - for components which may used across all site<br/>

Create folder 'components' for client components in some component (e.g Navbar) if required
e.g in Navbar you have searchbar dark mode switcher user avatar etc - for that I created folder components in Navbar

Please use components related to some specific route (like support) in (support) or any other organization route

### Usage for Buttons folder

In this folder you put all buttons that repeats across site e.g:<br/>
`IncreaseProductQantity`<br/>
`DecreaseProductQuantity`<br/>
`ClearProductQuantity`<br/>
`RequestReplanishment`

### Usage for Inputs folder

Inputs/Validation - in this folder input that requires any validation
You may copy paste some input and just change regExp pattern (I mean `validationRules`)

`Input.tsx` - this just normal input that requires no validation<br/>
`SearchInput.tsx` - this input for search that you see in top center of screen (in Navbar)
this input has no `onChange` that's why can be used with FormData as server component to keep SSR to improve performance

### Usage for Modals folder

Modal/AdminPanel - login with google - click on your avatar in top right corner - click 'Admin Panel'<br/>
no something special just some TSX and logic related to actions in `AdminPanelModal.tsx`<br/>
Modal/AuthModal - logout (if logged in) - click on your avatar in top right corner<br/>
issues of this `AuthModal.tsx` is:

1. Auth with credentials work very buggy (fake login/register/recover errors)
2. Login with FACEIT and Twitter doesn't work
3. Registration works with bugs (I some issues with expired token and I may register existing user)
4. 'Remember me' button do nothing
5. Recover password works but it not tested - it means I may do smth and broke it

Modal/CartModal - click on cart in top right corner
Modal/ModalContainers - check dev_readme.md

`AreYouSureClearCartModal.tsx` - this modal appears if user want to clear cart in CartModal.tsx
`AreYouSureDeleteProductModal.tsx` - this modal appears if user want to delete product in DeleteProductForm.tsx
`ChangeLanguageModal.tsx` - login - click on avatar in top right corner - 'Change language'
`CtrlKModal.tsx` - click Ctrl+K

### Usage for Button.tsx

If you use `variant='link'` button turns into a `<Link/>` component from `next/link`

```tsx
  <Button variant='continue-with'>
    Continue with Google
    <AiOutlineGoogle className='text-title-foreground' size={42} />
  </Button>
  <Button variant='cta'>cta</Button>
  <Button variant='danger'>danger</Button>
  <Button variant='success'>success</Button>
  <Button variant='link'>link</Button>
  <Button variant='nav-link' active='active'>nav-link active</Button>
  <Button variant='nav-link' active='inactive'>nav-link inactive</Button>
```

### Usage for Checkbox.tsx

Square checkbox that may be user for 'Rembember me' button for example (may be moved to (auth) folder)

```tsx

  const [isChecked, setIsChecked] = useState(false)

<Checkbox
  className="bg-background cursor-pointer"
  label="Remember me"
  onChange={() => setIsChecked(isChecked => !isChecked)}
  disabled={isSubmitting}
  isChecked={isChecked}
/>
```

### Usage for DropdownContainer.tsx

Dropdown container - its like you click on something and got dropdown
See exmaple of usage in - vs code - ctrl+shift+f + `<DropdownConta`

```tsx
import { DropdownContainer } from "./ui/DropdownContainer"
import { DropdownItem } from "./ui/DropdownItem"

      {/* HAMBURDER-ICON */}
      <DropdownContainer className="w-[200px]" icon={<FiPhoneCall size={28} />}>
        <DropdownItem icon={<FiPhoneCall size={28} />} label="Profile" onClick={() => window.open('https://google.com')} size={28} />
      </DropdownContainer>

      //or with image

      <DropdownContainer className="w-[200px]" icon={<img className="flex tablet:hidden rounded-full w-[32px] h-[32px]" src='/placeholder.jpg' />}>
        <DropdownItem icon={<FiPhoneCall size={28} />} label="Profile" onClick={() => window.open('https://google.com')} size={28} />
      </DropdownContainer>

```

### Usage for DropdownItem.tsx

Its something that you see in DropdownContainer.tsx
See exmaple of usage in - vs code - ctrl+shift+f + `<DropdownItem`

### Usage for RadioButton.tsx

I use this in `AdminPanel.tsx`

### Usage for Slider.tsx

I use it in `Product.tsx`
This file have issues because its not done and change slides not as I see in my head

### Usage for Toast.tsx

```tsx
/* usage
const message = useMessage()

message.show('status',?'title',?'subTitle',?timeout)
e.g
message.show('success')
message.show('success','custom title')
message.show('success','custom title','custom subTitle')
message.show('success','custom title','custom subTitle',3000) //disashow after 3s
*/
```

Also you may check example of usage in another files
vs code - ctrl+shift+f - `<Toast`
