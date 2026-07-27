import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{d as r,f as i,i as a,n as o,o as s,r as c,s as l}from"./client-Cqr6_oOt.js";import{D as u,E as d,Yt as f,ft as p,i as m,mt as ee,pt as te,r as ne}from"./iframe-CdhYZE3q.js";import{i as h,o as g}from"./esm-1JbrSO5M.js";import{I as re,L as _,d as ie,f as ae,g as oe,k as se,m as ce,n as le,r as ue,t as v}from"./ui-BjvJuuqs.js";import{i as de,r as fe,t as y}from"./FormInput-DVfXwYpH.js";import{t as pe}from"./Validation-vRIJG83Z.js";import{n as me,t as b}from"./Button-Dpp6Rwit.js";import{n as he,t as x}from"./OpenAuthModalButton-BwrjzFSI.js";function ge(){let e=`https://www.jokik.fi/`.replace(/\/+$/,``);return window.location.origin?window.location.origin:e||``}var _e=e((()=>{})),S,C,ve=e((()=>{l(),te(),S=e=>({lastAttempt:null,setLastAttempt:t=>e(()=>({lastAttempt:t}))}),C=s()(p(ee(e=>S(e),{name:`oauth:lastAttempt`})))}));function w({href:e,provider:t,className:n}){let r=m(),i=a(),o=c(),{setLastAttempt:s}=C();async function l(e){e.preventDefault();try{let e=ge(),n=`${e}/${o}/auth/callback/oauth?provider=${t}`,r={provider:t,locale:o,callbackBaseUrl:e,redirectTo:n,currentHref:window.location.href,startedAt:new Date().toISOString()};if(s(JSON.stringify(r)),console.log(`[auth:oauth][client] starting OAuth flow`,{...r}),t===`google`){let{error:e}=await u.auth.signInWithOAuth({provider:`google`,options:{redirectTo:n}});if(e)throw Error(e.message)}else if(t===`faceit`)throw Error(`${i(`auth.error.faceit_not_implemented`)} support@nicitaa.com`);else if(t===`twitter`){let{error:e}=await u.auth.signInWithOAuth({provider:`twitter`,options:{redirectTo:n}});if(e)throw Error(e.message)}}catch(e){console.error(`[auth:oauth][client] failed to start OAuth flow`,{provider:t,locale:o,error:e instanceof Error?e.message:String(e)}),r.show(`error`,`${i(`auth.error.continuing_with`)} ${t}`,e instanceof Error?e.message:String(e))}}return(0,T.jsx)(`form`,{onSubmit:l,children:(0,T.jsx)(b,{className:g(`h-12 rounded-xl`,n),href:e,type:`submit`,variant:`continue-with`,fullWidth:!0,children:t===`google`?(0,T.jsx)(_,{src:`/google.png`,alt:i(`auth.continue_with_google`),width:24,height:24,priority:!0}):t===`faceit`?(0,T.jsx)(_,{src:`/faceit.png`,alt:i(`auth.continue_with_faceit`),width:24,height:24,priority:!0}):(0,T.jsx)(_,{className:`w-[24px] h-[19px]`,src:`/twitter.png`,alt:i(`auth.continue_with_twitter`),width:24,height:19,priority:!0})})})}var T,ye=e((()=>{T=f(),re(),h(),_e(),d(),o(),ve(),ne(),me(),w.__docgenInfo={description:``,methods:[],displayName:`ContinueWithButton`,props:{provider:{required:!0,tsType:{name:`union`,raw:`"google" | "faceit" | "twitter"`,elements:[{name:`literal`,value:`"google"`},{name:`literal`,value:`"faceit"`},{name:`literal`,value:`"twitter"`}]},description:``},className:{required:!1,tsType:{name:`string`},description:``},href:{required:!1,tsType:{name:`string`},description:``}}}}));function E({isSubmitting:e,isEmailSent:t,queryParams:n,pathname:r}){let i=a();return(0,D.jsxs)(`section`,{className:`flex w-full flex-col gap-y-4 pt-3 text-center`,children:[(0,D.jsx)(`p`,{className:`text-lg text-subTitle`,children:i(`auth.or.continue`)}),(0,D.jsxs)(`div`,{className:`grid grid-cols-3 gap-2 mobile:gap-3 ${e&&`opacity-50 cursor-default pointer-events-none`}`,children:[(0,D.jsx)(w,{provider:`google`}),(0,D.jsx)(w,{provider:`faceit`}),(0,D.jsx)(w,{provider:`twitter`})]}),(0,D.jsx)(b,{className:g(`justify-center text-base`,t&&`opacity-50 pointer-events-none cursor-default`),href:`${r}?modal=AuthModal&variant=${n===`login`?`register`:`login`}`,variant:`link`,disabled:t,children:i(n===`login`?`auth.register.button`:`auth.login.button`)})]})}var D,be=e((()=>{D=f(),h(),ye(),o(),v(),E.__docgenInfo={description:``,methods:[],displayName:`AuthContinueWith`,props:{isSubmitting:{required:!0,tsType:{name:`boolean`},description:``},isEmailSent:{required:!0,tsType:{name:`boolean`},description:``},queryParams:{required:!0,tsType:{name:`union`,raw:`"login" | "register"`,elements:[{name:`literal`,value:`"login"`},{name:`literal`,value:`"register"`}]},description:``},pathname:{required:!0,tsType:{name:`string`},description:``}}}}));function xe(){return()=>{}}function O({handleSubmit:e,onSubmit:t,queryParams:n,register:r,errors:o,isSubmitting:s,isEmailSent:c,responseMessage:l}){let u=i()||``,d=a(),[f,p]=(0,A.useState)(!1),m=(0,A.useSyncExternalStore)(xe,()=>!0,()=>!1);return(0,k.jsxs)(k.Fragment,{children:[(0,k.jsxs)(`form`,{className:`relative mb-3 flex w-full max-w-full flex-col gap-y-4`,"data-cy":`auth-form`,onSubmit:e(t),children:[n!==`resetPassword`&&(0,k.jsx)(y,{className:`h-11 rounded-2xl`,endIcon:(0,k.jsx)(ae,{size:24}),register:r,errors:o,id:`email`,label:d(`auth.email.label`),placeholder:d(`auth.email.placeholder`),disabled:s||c,required:!0,validationMessages:{required:d(`auth.email.validation.required`),pattern:d(`auth.email.validation.invalid`)}}),n!==`recover`&&(0,k.jsx)(y,{className:`h-11 rounded-2xl`,endIcon:(0,k.jsx)(ie,{size:24}),register:r,errors:o,id:`password`,label:d(`auth.password.label`),type:`password`,placeholder:d(n===`register`||n===`resetPassword`?`auth.password.placeholder_new`:`auth.password.placeholder`),disabled:s||c,required:!0,validationMessages:{required:d(`auth.password.validation.required`),pattern:d(`auth.validation.password_invalid`)}}),n===`register`&&(0,k.jsx)(y,{className:`h-11 rounded-2xl`,endIcon:(0,k.jsx)(ce,{size:24}),register:r,errors:o,id:`username`,label:d(`auth.username.label`),placeholder:d(`auth.username.placeholder`),disabled:s||c,required:!0,validationMessages:{required:d(`auth.validation.username.required`),pattern:d(`auth.validation.username_invalid`)}}),(0,k.jsxs)(`div`,{className:`mb-1 flex items-center justify-between gap-3`,children:[(0,k.jsx)(`div`,{className:g(`invisible flex min-h-[20px] items-center`,n===`login`&&`visible`),children:(0,k.jsx)(se,{label:d(`auth.remember.me`),onChange:()=>p(e=>!e),disabled:s,isChecked:f})}),n!==`register`&&(0,k.jsx)(b,{className:`text-sm mobile:text-base`,href:`${u}?modal=AuthModal&variant=${n===`login`?`recover`:`login`}`,variant:`link`,children:d(n===`login`?`auth.forgot.password`:`auth.sign.in`)})]}),(0,k.jsx)(b,{className:`mt-1 border-border-color/45 bg-background/55`,"data-cy":`auth-submit`,type:`submit`,variant:`default-outline`,size:`xl`,rounded:`xl`,fullWidth:!0,disabled:s||c||!m,children:n===`login`?d(`auth.sign.in`):n===`register`?d(`auth.sign.up`):n===`recover`||n===`resetPassword`?d(`auth.recovery.button`):`TODO - contact support - ask to translate it - попросите поддержку перевести этот текст`}),l?(0,k.jsx)(`div`,{className:`flex justify-center text-center text-sm`,"data-cy":`auth-response`,children:l}):null]}),(n===`login`||n===`register`)&&(0,k.jsx)(E,{isEmailSent:c,isSubmitting:s,queryParams:n,pathname:u})]})}var k,A,j=e((()=>{k=f(),A=t(n()),r(),h(),oe(),be(),o(),v(),pe(),O.__docgenInfo={description:``,methods:[],displayName:`AuthForm`,props:{handleSubmit:{required:!0,tsType:{name:`UseFormHandleSubmit`,elements:[{name:`IAuthFormData`},{name:`undefined`}],raw:`UseFormHandleSubmit<IAuthFormData, undefined>`},description:``},onSubmit:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(data: IAuthFormData) => Promise<void>`,signature:{arguments:[{type:{name:`IAuthFormData`},name:`data`}],return:{name:`Promise`,elements:[{name:`void`}],raw:`Promise<void>`}}},description:``},queryParams:{required:!0,tsType:{name:`union`,raw:`"login" | "register" | "recover" | "resetPassword"`,elements:[{name:`literal`,value:`"login"`},{name:`literal`,value:`"register"`},{name:`literal`,value:`"recover"`},{name:`literal`,value:`"resetPassword"`}]},description:``},register:{required:!0,tsType:{name:`UseFormRegister`,elements:[{name:`IAuthFormData`}],raw:`UseFormRegister<IAuthFormData>`},description:``},errors:{required:!0,tsType:{name:`FieldErrors`,elements:[{name:`IAuthFormData`}],raw:`FieldErrors<IAuthFormData>`},description:``},isSubmitting:{required:!0,tsType:{name:`boolean`},description:``},isEmailSent:{required:!0,tsType:{name:`boolean`},description:``},responseMessage:{required:!0,tsType:{name:`union`,raw:`ReactNode | null`,elements:[{name:`ReactNode`},{name:`null`}]},description:``}}}}));function Se({isEmailSent:e,isSubmitting:t,onSubmit:n,responseMessage:r,variant:i}){let{formState:{errors:a},handleSubmit:o,register:s}=de();return(0,N.jsxs)(`div`,{className:`mx-auto w-full max-w-md rounded-2xl border border-border-color bg-foreground p-6 shadow-compact`,children:[(0,N.jsx)(`h1`,{className:`mb-5 text-center text-2xl font-semibold text-title`,children:i===`register`?`Create account`:i===`login`?`Sign in`:`Password recovery`}),(0,N.jsx)(O,{errors:a,handleSubmit:o,isEmailSent:e,isSubmitting:t,onSubmit:n,queryParams:i,register:s,responseMessage:r})]})}function Ce({action:e}){return(0,N.jsx)(`div`,{className:`p-6`,children:(0,N.jsx)(le,{action:e,label:`Resend available in`,seconds:0,children:(0,N.jsx)(`button`,{className:`text-brand underline`,type:`button`,children:`Resend verification`})})})}function M(){return(0,N.jsxs)(`div`,{className:`flex items-center gap-3 rounded-lg border border-border-color bg-foreground p-5`,children:[(0,N.jsx)(`p`,{children:`Sign in to continue with this protected action.`}),(0,N.jsx)(x,{})]})}var N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q,$;e((()=>{N=f(),fe(),j(),he(),ue(),{expect:P,fn:F,userEvent:I,waitFor:L,within:R}=__STORYBOOK_MODULE_TEST__,z={title:`Authentication/AuthExample`,component:Se,args:{isEmailSent:!1,isSubmitting:!1,onSubmit:F(async()=>void 0),responseMessage:null,variant:`login`},parameters:{nextjs:{navigation:{pathname:`/en`,segments:[[`locale`,`en`]]}}}},B={},V={args:{variant:`register`}},H={args:{variant:`recover`}},U={args:{variant:`resetPassword`}},W={play:async({canvasElement:e})=>{let t=R(e);await P(await t.findByAltText(/continue with google/i)).toBeVisible(),await P(t.getByAltText(/continue with faceit/i)).toBeVisible(),await P(t.getByAltText(/continue with twitter/i)).toBeVisible()}},G={args:{isSubmitting:!0}},K={args:{responseMessage:`The supplied credentials were rejected.`}},q={args:{isEmailSent:!0,responseMessage:`Check your inbox to continue.`}},J={play:async({canvasElement:e})=>{let t=R(e);await I.click(await t.findByRole(`button`,{name:/sign in/i})),await P(await t.findByText(/email.*required|required.*email/i)).toBeVisible(),await P(t.getByText(/password.*required|required.*password/i)).toBeVisible()}},Y={play:async({args:e,canvasElement:t})=>{let n=R(t);await I.type(await n.findByLabelText(/email/i),`customer@example.test`),await I.type(n.getByLabelText(/password/i),`StrongPass1`),await I.click(n.getByRole(`button`,{name:/sign in/i})),await L(()=>P(e.onSubmit).toHaveBeenCalledWith({email:`customer@example.test`,password:`StrongPass1`},P.anything()))}},X={args:{onSubmit:F(async()=>void 0)},render:e=>(0,N.jsx)(Ce,{action:e.onSubmit}),play:async({args:e,canvasElement:t})=>{let n=R(t);await P(await n.findByRole(`button`,{name:`Resend verification`})).toBeVisible(),await L(()=>P(e.onSubmit).toHaveBeenCalledOnce())}},Z={render:()=>(0,N.jsx)(`p`,{className:`p-6`,role:`status`,children:`Authenticated users are redirected away from the authentication modal.`}),play:async({canvasElement:e})=>{await P(R(e).getByRole(`status`)).toHaveTextContent(`redirected`)}},Q={render:M,play:async({canvasElement:e})=>{let t=await R(e).findByRole(`link`,{name:`login`});await P(t).toHaveAttribute(`href`,`/en?modal=AuthModal&variant=login`)}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "register"
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "recover"
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "resetPassword"
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByAltText(/continue with google/i)).toBeVisible();
    await expect(canvas.getByAltText(/continue with faceit/i)).toBeVisible();
    await expect(canvas.getByAltText(/continue with twitter/i)).toBeVisible();
  }
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  args: {
    isSubmitting: true
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  args: {
    responseMessage: "The supplied credentials were rejected."
  }
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  args: {
    isEmailSent: true,
    responseMessage: "Check your inbox to continue."
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", {
      name: /sign in/i
    }));
    await expect(await canvas.findByText(/email.*required|required.*email/i)).toBeVisible();
    await expect(canvas.getByText(/password.*required|required.*password/i)).toBeVisible();
  }
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText(/email/i), "customer@example.test");
    await userEvent.type(canvas.getByLabelText(/password/i), "StrongPass1");
    await userEvent.click(canvas.getByRole("button", {
      name: /sign in/i
    }));
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledWith({
      email: "customer@example.test",
      password: "StrongPass1"
    }, expect.anything()));
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  args: {
    onSubmit: fn(async () => undefined)
  },
  render: args => <VerificationTimerExample action={args.onSubmit as unknown as () => void} />,
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", {
      name: "Resend verification"
    })).toBeVisible();
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
  }
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  render: () => <p className="p-6" role="status">
      Authenticated users are redirected away from the authentication modal.
    </p>,
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("redirected");
  }
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  render: AnonymousPrompt,
  play: async ({
    canvasElement
  }) => {
    const findByRoleResp = await within(canvasElement).findByRole("link", {
      name: "login"
    });
    await expect(findByRoleResp).toHaveAttribute("href", "/en?modal=AuthModal&variant=login");
  }
}`,...Q.parameters?.docs?.source}}},$=[`SignIn`,`Registration`,`PasswordRecovery`,`PasswordReset`,`OAuthChoices`,`PendingRequest`,`BackendRejection`,`EmailSent`,`ValidationFailures`,`SubmissionArguments`,`VerificationTimer`,`AuthenticatedRedirect`,`AnonymousProtectedAction`]}))();export{Q as AnonymousProtectedAction,Z as AuthenticatedRedirect,K as BackendRejection,q as EmailSent,W as OAuthChoices,H as PasswordRecovery,U as PasswordReset,G as PendingRequest,V as Registration,B as SignIn,Y as SubmissionArguments,J as ValidationFailures,X as VerificationTimer,$ as __namedExportsOrder,z as default};