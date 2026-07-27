import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{Yt as r}from"./iframe-CdhYZE3q.js";import{i,n as a,r as o,t as s}from"./FormInput-DVfXwYpH.js";import{n as c,t as l}from"./BaseInput-C0LI5rus.js";import{h as u,l as d}from"./index.esm-BXc_jsY6.js";import{n as f,t as p}from"./SearchInput-CS7F8Vos.js";import{n as m,t as h}from"./Input-DNxUhCe4.js";function g(){let[e,t]=(0,y.useState)(`Joki`);return(0,v.jsxs)(`div`,{className:`grid max-w-lg gap-3 p-3`,children:[(0,v.jsxs)(`label`,{className:`grid gap-1 text-sm text-title`,children:[`Base input`,(0,v.jsx)(l,{placeholder:`Base input`})]}),(0,v.jsxs)(`label`,{className:`grid gap-1 text-sm text-title`,children:[`Controlled input`,(0,v.jsx)(h,{value:e,onChange:e=>t(e.target.value)})]}),(0,v.jsxs)(`label`,{className:`grid gap-1 text-sm text-title`,children:[`Search`,(0,v.jsx)(p,{"aria-label":`Search products`,startIcon:(0,v.jsx)(d,{}),placeholder:`Search products`})]}),(0,v.jsxs)(`label`,{className:`grid gap-1 text-sm text-title`,children:[`Disabled`,(0,v.jsx)(l,{disabled:!0,value:`Unavailable`,readOnly:!0})]})]})}function _(){let{register:e,formState:{errors:t},handleSubmit:n}=i({defaultValues:{email:``,password:``,username:``}});function r(){}return(0,v.jsxs)(`form`,{className:`grid max-w-md gap-3 p-3`,onSubmit:n(r),children:[(0,v.jsx)(s,{id:`email`,label:`Email`,placeholder:`name@example.com`,register:e,errors:t,required:!0}),(0,v.jsx)(s,{id:`password`,label:`Password`,type:`password`,register:e,errors:t,required:!0}),(0,v.jsx)(`button`,{className:`h-8 rounded border border-brand bg-brand/10 px-3 text-sm text-brand`,type:`submit`,children:`Validate`})]})}var v,y,b,x,S,C,w,T,E,D,O;e((()=>{v=r(),y=t(n()),u(),o(),c(),a(),m(),f(),{expect:b,userEvent:x,waitFor:S,within:C}=__STORYBOOK_MODULE_TEST__,w={title:`UI/Inputs/BaseInput`,component:l},T={render:g},E={render:_,play:async({canvasElement:e})=>{let t=C(e),n=await S(()=>t.getByRole(`button`,{name:`Validate`}));await x.click(n),await b(t.getAllByText(`This field is required`)).toHaveLength(2),await x.type(t.getByRole(`textbox`,{name:/Email/}),`invalid`),await x.type(t.getByLabelText(/Password/),`weak`),await x.click(t.getByRole(`button`,{name:`Validate`})),await b(t.getByText(`Enter valid email address`)).toBeVisible()}},D={render:g,play:async({canvasElement:e})=>{let t=C(e),n=await S(()=>t.getByRole(`textbox`,{name:`Search products`}));await x.click(n),await x.type(n,`headphones`),await b(n).toHaveValue(`headphones`),await b(n).toHaveFocus()}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: InputMatrix
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: ValidationForm,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const validateButton = await waitFor(() => canvas.getByRole("button", {
      name: "Validate"
    }));
    await userEvent.click(validateButton);
    await expect(canvas.getAllByText("This field is required")).toHaveLength(2);
    await userEvent.type(canvas.getByRole("textbox", {
      name: /Email/
    }), "invalid");
    await userEvent.type(canvas.getByLabelText(/Password/), "weak");
    await userEvent.click(canvas.getByRole("button", {
      name: "Validate"
    }));
    await expect(canvas.getByText("Enter valid email address")).toBeVisible();
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: InputMatrix,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const searchInput = await waitFor(() => canvas.getByRole("textbox", {
      name: "Search products"
    }));
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, "headphones");
    await expect(searchInput).toHaveValue("headphones");
    await expect(searchInput).toHaveFocus();
  }
}`,...D.parameters?.docs?.source}}},O=[`States`,`Validation`,`SearchKeyboardFocus`]}))();export{D as SearchKeyboardFocus,T as States,E as Validation,O as __namedExportsOrder,w as default};