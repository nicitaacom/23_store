import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{J as r,R as i,Y as a,Yt as o,b as s,x as c}from"./iframe-CdhYZE3q.js";import{A as l,C as u,E as d,T as f,_ as p,a as m,b as h,i as g,k as _,v,w as y,y as b}from"./ui-BjvJuuqs.js";import{a as x,d as S,h as C,p as w}from"./index.esm-BXc_jsY6.js";import{i as T,n as E,r as D,t as O}from"./ProductQuantityButton-D0gMRKYl.js";function k(){let[e,t]=(0,F.useState)(!1),[n,r]=(0,F.useState)(`standard`);return(0,P.jsxs)(`div`,{className:`grid max-w-md gap-3 p-3`,children:[(0,P.jsx)(_,{isChecked:e,label:`Remember my choice`,onChange:()=>t(e=>!e)}),(0,P.jsxs)(`fieldset`,{className:`grid grid-cols-2 gap-2`,children:[(0,P.jsx)(`legend`,{className:`mb-1 text-sm text-title`,children:`Delivery`}),(0,P.jsx)(p,{checked:n===`standard`,inputName:`delivery`,label:`standard`,onChange:e=>r(e.target.value),children:`Standard`}),(0,P.jsx)(p,{checked:n===`express`,inputName:`delivery`,label:`express`,onChange:e=>r(e.target.value),children:`Express`})]})]})}function A(){return(0,P.jsxs)(`div`,{className:`grid max-w-lg gap-3 p-3`,children:[(0,P.jsx)(b,{label:`Waiting`,value:0}),(0,P.jsx)(b,{label:`Uploading`,value:.48}),(0,P.jsx)(b,{label:`Complete`,value:1})]})}function j(){let e=`${r.product}::${r.variant}`,t=c(t=>t.products[e]?.quantity??0);return(0,F.useLayoutEffect)(()=>{c.setState({products:{[e]:{id:r.product,quantity:1,variantId:r.variant}},productsData:[]})},[e]),(0,P.jsxs)(`div`,{className:`flex items-center gap-2 p-3`,children:[(0,P.jsxs)(`div`,{className:`flex overflow-hidden rounded border border-border-color`,children:[(0,P.jsx)(O,{action:`decrease`,productId:r.product,variantId:r.variant}),(0,P.jsx)(`output`,{className:`flex min-w-8 items-center justify-center bg-background text-sm text-title`,"aria-label":`Quantity`,children:t}),(0,P.jsx)(O,{action:`increase`,productId:r.product,variantId:r.variant})]}),(0,P.jsx)(O,{action:`clear`,productId:r.product,variantId:r.variant}),(0,P.jsx)(D,{productId:`product-new-23`})]})}function M(){let[e,t]=(0,F.useState)(!1);return(0,P.jsx)(`div`,{className:`flex justify-end p-3`,children:(0,P.jsxs)(f,{list:!0,dropdownRef:(0,F.useRef)(null),icon:(0,P.jsx)(`button`,{className:`h-8 w-8 rounded border border-border-color`,"aria-label":`Open actions`,children:(0,P.jsx)(x,{})}),isDropdown:e,toggle:()=>t(e=>!e),children:[(0,P.jsx)(u,{icon:w,label:`Profile`}),(0,P.jsx)(u,{icon:S,label:`Orders`,href:`/en/orders`})]})})}function N(){return(0,P.jsx)(`div`,{className:`h-64 w-80 p-3`,children:(0,P.jsx)(g,{height:240,images:[{src:a.product,alt:`Joki headphones`},{src:a.productAlternative,alt:`Alternative product`}],width:320,emulateTouch:!0,swipeable:!0})})}var P,F,I,L,R,z,B,V,H,U,W,G,K;e((()=>{P=o(),F=t(n()),C(),i(),s(),T(),l(),d(),y(),E(),h(),v(),m(),{expect:I,userEvent:L,waitFor:R,within:z}=__STORYBOOK_MODULE_TEST__,B={title:`UI/Controls/SelectionControls`,component:k},V={play:async({canvasElement:e})=>{let t=z(e),n=await R(()=>t.getByRole(`checkbox`,{name:`Remember my choice`}));await L.click(n),await I(n).toBeChecked(),await L.click(t.getByRole(`radio`,{name:`Express`})),await I(t.getByRole(`radio`,{name:`Express`})).toBeChecked()}},H={render:A},U={render:j,play:async({canvasElement:e})=>{let t=z(e);await R(()=>I(t.getByLabelText(`Quantity`)).toHaveTextContent(`1`)),await L.click(t.getByRole(`button`,{name:`+`})),await R(()=>I(t.getByLabelText(`Quantity`)).toHaveTextContent(`2`)),await L.click(t.getByRole(`button`,{name:`−`})),await R(()=>I(t.getByLabelText(`Quantity`)).toHaveTextContent(`1`)),await L.click(t.getByRole(`button`,{name:`Clear`})),await R(()=>I(t.getByLabelText(`Quantity`)).toHaveTextContent(`0`)),await L.click(t.getByRole(`button`,{name:/add to cart/i})),await I(c.getState().products[`product-new-23`]).toMatchObject({quantity:1})}},W={render:M,play:async({canvasElement:e})=>{let t=z(e),n=await R(()=>t.getByRole(`button`,{name:`Open actions`}));await L.click(n),await R(()=>I(t.getByText(`Profile`)).toBeVisible())}},G={render:N},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const checkbox = await waitFor(() => canvas.getByRole("checkbox", {
      name: "Remember my choice"
    }));
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", {
      name: "Express"
    }));
    await expect(canvas.getByRole("radio", {
      name: "Express"
    })).toBeChecked();
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  render: ProgressStates
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  render: ProductQuantityControl,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByLabelText("Quantity")).toHaveTextContent("1"));
    await userEvent.click(canvas.getByRole("button", {
      name: "+"
    }));
    await waitFor(() => expect(canvas.getByLabelText("Quantity")).toHaveTextContent("2"));
    await userEvent.click(canvas.getByRole("button", {
      name: "−"
    }));
    await waitFor(() => expect(canvas.getByLabelText("Quantity")).toHaveTextContent("1"));
    await userEvent.click(canvas.getByRole("button", {
      name: "Clear"
    }));
    await waitFor(() => expect(canvas.getByLabelText("Quantity")).toHaveTextContent("0"));
    await userEvent.click(canvas.getByRole("button", {
      name: /add to cart/i
    }));
    await expect(useCartStore.getState().products["product-new-23"]).toMatchObject({
      quantity: 1
    });
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  render: DropdownExample,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const actionsButton = await waitFor(() => canvas.getByRole("button", {
      name: "Open actions"
    }));
    await userEvent.click(actionsButton);
    await waitFor(() => expect(canvas.getByText("Profile")).toBeVisible());
  }
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  render: ProductSlider
}`,...G.parameters?.docs?.source}}},K=[`Selection`,`Progress`,`QuantityAndCart`,`Dropdown`,`ImageSlider`]}))();export{W as Dropdown,G as ImageSlider,H as Progress,U as QuantityAndCart,V as Selection,K as __namedExportsOrder,B as default};