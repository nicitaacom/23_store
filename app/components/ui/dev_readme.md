### components/ui folder usage

/ - for root components<br/>
/Navbar - for navbar and nested in navbar components<br/>
/ui - for components which may used across all site<br/>

Create folder 'components' for client components in some component (e.g Navbar) if required

### Usage for Input

Use Inputs/Validation for inputs with validation

```tsx
  const [search, setSearch] = useState('') //example

      <Input
      startIcon={<BiSearchAlt size={24} />}
      className="hidden tablet:flex w-[40vw] max-w-[600px]"
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Search..."
    />
  <p>Search:{search}</p>

```

### Usage for Modals

check Modals/dev_readme.md

### Usage for Button

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

### Usage for Dropdown

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
