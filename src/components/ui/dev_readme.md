### RadioButton

```tsx
  const [label1, setLabel1] = useState('') //example
  const [label2, setLabel2] = useState('') //example

          <RadioButton label="Add product" inputName="input-name1" onChange={(e) => setLabel1(e.target.value)} />
          <RadioButton label="Edit product" inputName="input-name1" onChange={(e) => setLabel1(e.target.value)} />
          <RadioButton label="Delete product" inputName="input-name1" onChange={(e) => setLabel1(e.target.value)} />

          <RadioButton label="Add product2" inputName="input-name2" onChange={(e) => setLabel2(e.target.value)} />
          <RadioButton label="Edit product2" inputName="input-name2" onChange={(e) => setLabel2(e.target.value)} />
          <RadioButton label="Delete product2" inputName="input-name2" onChange={(e) => setLabel2(e.target.value)} />

  <p>{label1 == 'Edit product' ? 'do stuff 1' : 'do stuff 2'}</p>
  <p>label 1 - {label1}</p>
  <p>label 2 - {label2}</p>

```

For every state label1 - use the same inputName1 and setLabel1<br/>
For every RadioButton - use different labels (if you delete 2 from Add product2 it willn't work)<br/>

### Input

```tsx
  const [email, setEmail] = useState('') //example
  const [password, setPassword] = useState('') //example
  const [repeatPassword, setRepeatPassword] = useState('') //example

  <Input placeholder="Email" type='email' value={email} onChange={e => setEmail(e.target.value)} />
  <Input placeholder="Password" type='password' value={password} onChange={e => setPassword(e.target.value)} />
  <Input placeholder="Repeat password" type='password' value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} />
  <p>Email:{email}</p>
  <p>Pasword:{password}</p>
  <p>Repeat password:{repeatPassword}</p>

```

### Button

```tsx
  <Button variant='continue-with'>
    Continue with Google
    <AiOutlineGoogle className='text-title' size={42} />
  </Button>
  <Button variant='cta'>cta</Button>
  <Button variant='danger'>danger</Button>
  <Button variant='success'>success</Button>
  <Button variant='link'>link</Button>
  <Button variant='nav-link' active='active'>nav-link active</Button>
  <Button variant='nav-link' active='inactive'>nav-link inactive</Button>
```

### Switch

```tsx
  const mode = useDarkMode()


   <Switch isChecked={mode.isDarkMode} onChange={mode.toggleDarkMode} />
```
