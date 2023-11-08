## Pull requests

[PR#59]-imp-close_avatar_dropdown_on_item_click
In case task related to this PR done you - in [] you write PR and number of this PR

[PR#59-UPD]-imp-close_avatar_dropdown_on_item_click
In case task not done every day when you finish coding you do this PR - in [] you write PR and number of this PR and -UPD

<br/>

---

<br/>

## Github projects

### Task naming

in case you need to create some task you name this task like below
add-close_authModal_button
imp-close_avatarDropdown_onClickOutside
add-root-open_supportModal_button
add-ProductTSX-requestReplanishment_button
add-open_supporDropdown_button_UI+logic
imp-auth
fix-sendEmailToUnauthorizedUser_afterPayment
More examples - https://github.com/users/nicitaacom/projects/5/views/1?sortedBy%5Bdirection%5D=desc&sortedBy%5BcolumnId%5D=59471618&pane=issue

1. Start with **add** if you need to add smth and **imp** if you need to improve and **fix** if you need to fix smth
2. Add 3-4 _snake_case_ worlds what do you want to add
   Basicaly on:
   firstWorld you write logic that object should do e.g close

   secondWorld you write where it should be e.g authModal

   thirdWorld you write object that do something e.g button

   fourthWorld you write condition e.g onCloseOutside

3. Just check more examples - to get understanding (because for example not always you should write)
   in which file you need imp or fix smth because it may obvioulsy

### Commit naming

style: mb-8 instead of pb-8
chore: AvatarDropdown.tsx incapsulated
chore: ModalContainer renamed to ModalQueryContainer
upd: store for avatarDropdown created
feat: close avatarDropdown on DropdownItem click
docs: commit naming add

1. chore - for update that doesn't affect on user
2. style - only styling changes
3. upd - some minor changes that leads to feat
4. feat - for some ready feature
5. docs - for docs changes

<br/>

---

<br/>

To write documentation for your project, you can follow these guidelines:

a. Start with an overview: Provide an introduction to your E-commerce project, describing its purpose and goals. Explain the technologies and frameworks you used.

b. Installation and setup: Provide step-by-step instructions on how to install and set up your project. Include any specific dependencies or global configurations needed.

c. Folder structure: Explain the structure of your projects folders and files. Describe the purpose of each folder or file and how they relate to each other.
Say how I use imports like (react - dependencies - custom)
Say that I name my interfaces like so
IInterface - interface that has export and uses 2+ times in project
InterfaceProps - interface that use in props
interfaceType - type of some interface (it some data from exising interface - provide example)

d. Components: Document the components you have created, including their purpose, props, and examples of usage. Explain how to use and customize each component, and provide code snippets when applicable.

e. Pages: Describe the different pages in your e-commerce application, their purpose, and the components they use.

f. Store (State management): Explain how you are managing state in your project, specifically focusing on the usage of Zustand and how it handles global state.

g. APIs and External Services: Document any APIs or external services that your project relies on, such as Supabase or Stripe. Explain how to integrate these services into your project and provide relevant code examples.
Data fetching: Explain how you fetch data from Supabase or other APIs. Provide examples of API calls and how you handle the data received.

h. Forms and Validation: Describe how you are handling form submission and validation using React Hook Form. Include examples and explanations for different types of form fields.

i. Emails and Notifications: Explain how you are sending emails and notifications in your project. Describe the technologies you are using (such as React Email and Resend) and provide code examples for sending different types of emails.

j. Deployment: Explain how to deploy your project to a live environment. Include any necessary configurations or deployment strategies specific to your project.

From me:
1)I want add somewhere how to use supabase (select column row etc) - it may be dev_reamde.md in libs folder
2)add-guide_for_env
