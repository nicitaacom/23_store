import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{Yt as r}from"./iframe-CdhYZE3q.js";import{n as i,t as a}from"./MarkdownEditor-BKWsFji8.js";import{n as o,t as s}from"./MarkdownText-BCS-6oEp.js";import{n as c,t as l}from"./MessageInput-DGyix_1u.js";function u(){let[e,t]=(0,f.useState)(`**Balanced sound**
* Comfortable fit
_Three year warranty_`);return(0,d.jsxs)(`div`,{className:`grid gap-3 bg-modal-surface p-3 tablet:grid-cols-2`,children:[(0,d.jsxs)(`div`,{children:[(0,d.jsx)(`h2`,{className:`mb-2 text-sm font-semibold text-title`,children:`Editor`}),(0,d.jsx)(a,{value:e,onChange:t,placeholder:`Describe the product`})]}),(0,d.jsxs)(`div`,{className:`rounded border border-border-color bg-background p-3`,children:[(0,d.jsx)(`h2`,{className:`mb-2 text-sm font-semibold text-title`,children:`Rendered markdown`}),(0,d.jsx)(s,{text:e})]})]})}var d,f,p,m,h,g,_,v,y,b,x,S;e((()=>{d=r(),f=t(n()),i(),o(),c(),{expect:p,fn:m,userEvent:h,waitFor:g,within:_}=__STORYBOOK_MODULE_TEST__,v={title:`UI/Inputs/MessageInput`,component:l,args:{onSend:m(async()=>void 0),placeholder:`Type a message`}},y={play:async({args:e,canvasElement:t})=>{let n=_(t),r=await g(()=>n.getByPlaceholderText(`Type a message`)),i=n.getByRole(`button`);await p(i).toBeDisabled(),await h.type(r,`Please reserve the black variant`),await h.keyboard(`{Enter}`),await p(e.onSend).toHaveBeenCalledWith(`Please reserve the black variant`,null),await p(r).toHaveValue(``)}},b={render:u},x={render:function(){return(0,d.jsx)(`div`,{className:`bg-modal-surface p-3`,children:(0,d.jsx)(a,{disabled:!0,value:`**Read only**`,onChange:m()})})}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const messageInput = await waitFor(() => canvas.getByPlaceholderText("Type a message"));
    const sendButton = canvas.getByRole("button");
    await expect(sendButton).toBeDisabled();
    await userEvent.type(messageInput, "Please reserve the black variant");
    await userEvent.keyboard("{Enter}");
    await expect(args.onSend).toHaveBeenCalledWith("Please reserve the black variant", null);
    await expect(messageInput).toHaveValue("");
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: MarkdownExample
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: function DisabledMarkdownExample() {
    return <div className="bg-modal-surface p-3"><MarkdownEditor disabled value="**Read only**" onChange={fn()} /></div>;
  }
}`,...x.parameters?.docs?.source}}},S=[`Message`,`Markdown`,`DisabledMarkdown`]}))();export{x as DisabledMarkdown,b as Markdown,y as Message,S as __namedExportsOrder,v as default};