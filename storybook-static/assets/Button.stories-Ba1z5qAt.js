import{i as e}from"./preload-helper-CmHZQJgV.js";import{Yt as t}from"./iframe-CdhYZE3q.js";import{n,t as r}from"./Button-Dpp6Rwit.js";import{f as i,h as a,t as o}from"./index.esm-BXc_jsY6.js";function s(){return(0,u.jsx)(`div`,{className:`grid grid-cols-2 gap-2 p-3 tablet:grid-cols-4`,children:g.map(e=>(0,u.jsx)(r,{variant:e,children:e},e))})}function c(){return(0,u.jsxs)(`div`,{className:`flex flex-wrap items-end gap-2 p-3`,children:[_.map(e=>(0,u.jsx)(r,{size:e,children:e},e)),(0,u.jsx)(r,{"aria-label":`Cart`,size:`icon-md`,variant:`icon`,children:(0,u.jsx)(i,{})})]})}function l(){return(0,u.jsxs)(`div`,{className:`grid max-w-md gap-2 p-3`,children:[(0,u.jsx)(r,{leftIcon:(0,u.jsx)(i,{}),children:`Icon on left`}),(0,u.jsx)(r,{rightIcon:(0,u.jsx)(o,{}),children:`Icon on right`}),(0,u.jsx)(r,{loading:!0,loadingText:`Updating`,children:`Pending`}),(0,u.jsx)(r,{disabled:!0,children:`Disabled`}),(0,u.jsx)(r,{fullWidth:!0,children:`Full width`}),(0,u.jsx)(r,{href:`/en/products`,variant:`link`,children:`Product link`})]})}var u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T;e((()=>{u=t(),a(),n(),{expect:d,fn:f,userEvent:p,waitFor:m,within:h}=__STORYBOOK_MODULE_TEST__,g=[`default`,`default-outline`,`primary`,`primary-outline`,`secondary`,`secondary-outline`,`info`,`info-outline`,`warning`,`warning-outline`,`danger`,`danger-outline`,`success`,`success-outline`,`ghost`,`link`,`gradient`,`nav-link`,`icon`,`continue-with`],_=[`xs`,`sm`,`md`,`lg`,`xl`],v={title:`UI/Buttons/Button`,component:r,args:{children:`Add to cart`,onClick:f()}},y={},b={render:s},x={render:c},S={render:l},C={play:async({args:e,canvasElement:t})=>{let n=h(t),r=await m(()=>n.getByRole(`button`,{name:`Add to cart`}));await p.tab(),await d(r).toHaveFocus(),await p.keyboard(`{Enter}`),await d(e.onClick).toHaveBeenCalledOnce()}},w={args:{disabled:!0},play:async({args:e,canvasElement:t})=>{let n=h(t),r=await m(()=>n.getByRole(`button`,{name:`Add to cart`}));await d(r).toBeDisabled(),await p.tab(),await d(r).not.toHaveFocus(),await d(e.onClick).not.toHaveBeenCalled()}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: ButtonVariants
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: ButtonSizes
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: ButtonStates
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const button = await waitFor(() => canvas.getByRole("button", {
      name: "Add to cart"
    }));
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledOnce();
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  },
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const button = await waitFor(() => canvas.getByRole("button", {
      name: "Add to cart"
    }));
    await expect(button).toBeDisabled();
    await userEvent.tab();
    await expect(button).not.toHaveFocus();
    await expect(args.onClick).not.toHaveBeenCalled();
  }
}`,...w.parameters?.docs?.source}}},T=[`Playground`,`Variants`,`Sizes`,`States`,`KeyboardActivation`,`DisabledBehavior`]}))();export{w as DisabledBehavior,C as KeyboardActivation,y as Playground,x as Sizes,S as States,b as Variants,T as __namedExportsOrder,v as default};