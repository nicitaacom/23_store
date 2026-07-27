import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{G as r,J as i,M as a,N as o,R as s,U as c,V as l,Yt as u}from"./iframe-CdhYZE3q.js";import{n as d,t as f}from"./Product-Cpc5HLQC.js";function p(e){return(0,h.useLayoutEffect)(()=>{o.setState({user:l})},[]),(0,m.jsx)(f,{...e})}var m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j;e((()=>{m=u(),h=t(n()),s(),a(),d(),{expect:g,userEvent:_,waitFor:v,within:y}=__STORYBOOK_MODULE_TEST__,b={title:`Commerce/Product`,component:f,args:c,parameters:{layout:`padded`}},x={},S={args:{translations:{...c.translations,en:{title:`Joki professional wireless headphones with active noise cancellation and an exceptionally long product title`,description:`**Studio detail** with a long localized explanation that verifies wrapping, truncation, compact spacing, and action alignment across mobile and desktop viewports.`}}}},C={args:{img_url:[]}},w={},T={args:{variantId:`variant-headphones-silver`}},E={play:async({canvasElement:e})=>{let t=y(e);await _.click(await v(()=>t.getByRole(`button`,{name:/Silver/}))),await v(()=>g(t.getByText(`$159.99`)).toBeVisible()),await g(t.getAllByText(/out of stock/i).length).toBeGreaterThan(0),await g(t.getByRole(`button`,{name:/request replenishment/i})).toBeVisible()}},D={args:r},O={args:{cartKey:`${i.product}::${i.variant}`,variantId:i.variant}},k={render:p},A={},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    translations: {
      ...headphonesProduct.translations,
      en: {
        title: "Joki professional wireless headphones with active noise cancellation and an exceptionally long product title",
        description: "**Studio detail** with a long localized explanation that verifies wrapping, truncation, compact spacing, and action alignment across mobile and desktop viewports."
      }
    }
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    img_url: []
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    variantId: "variant-headphones-silver"
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await waitFor(() => canvas.getByRole("button", {
      name: /Silver/
    })));
    await waitFor(() => expect(canvas.getByText("$159.99")).toBeVisible());
    await expect(canvas.getAllByText(/out of stock/i).length).toBeGreaterThan(0);
    await expect(canvas.getByRole("button", {
      name: /request replenishment/i
    })).toBeVisible();
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: soldOutProduct
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    cartKey: \`\${FIXTURE_IDS.product}::\${FIXTURE_IDS.variant}\`,
    variantId: FIXTURE_IDS.variant
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: ProductWithOwner
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{}`,...A.parameters?.docs?.source}}},j=[`Normal`,`LongLocalizedContent`,`MissingImage`,`MultipleVariants`,`SelectedVariant`,`SoldOutVariant`,`FullyOutOfStock`,`CartLockedVariant`,`OwnerControls`,`AnonymousControls`]}))();export{A as AnonymousControls,O as CartLockedVariant,D as FullyOutOfStock,S as LongLocalizedContent,C as MissingImage,w as MultipleVariants,x as Normal,k as OwnerControls,T as SelectedVariant,E as SoldOutVariant,j as __namedExportsOrder,b as default};