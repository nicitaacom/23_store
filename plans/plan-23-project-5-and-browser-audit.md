# Project 5 and browser audit

Source: [23_store Project 5](https://github.com/users/nicitaacom/projects/5/views/1), read on
2026-10-03. The board had 96 items: 56 marked Done and 40 marked To-do. This file tracks the
40 To-do cards locally, as requested. GitHub project status changes are not needed.

Work stays on `development`. Commit each completed card or distinct browser issue separately.
The project tracker records the overall plan status; checked rows below record finished tasks.

## Browser checks

- [x] Create a store test account and document its login: `cypress-owner@joki.example` is
  prepared by `cypress.config.ts`; the password constant and sign-in steps are in
  `cypress/README.md`. Commit `c7327461` clears the migrated password reset flag.
- [x] Fix catalog and avatar menu openings of Admin Panel. Commit `2af79a5a`; Playwright
  verified opening, query state, and backdrop dismissal.
- [ ] Run every reachable app route at phone, tablet, and desktop widths, including catalog,
  product, cart, auth, owner, support, and stats routes. Record and fix horizontal overflow,
  clipped text, unreachable controls, and controls hidden behind the chat dock. Include the
  supplied mobile catalog screenshot, where pagination and page size take too much height.
- [ ] Exercise visible buttons with Playwright after signing in as the fixture owner. Check
  the URL and visible state after each action, and fix any reproducible failure.
- [ ] Reproduce the reported connection loss during Admin Panel use. Keep the page usable and
  show a useful retry state when a request fails.
- [x] Read the Storybook CI failure from the supplied run and fix the repeated console error.
  The old run first logged an expected ErrorBoundary story error, then the reporter wrapped its
  own error repeatedly. The current story filters that expected log; the reporter now installs
  once across module reloads. The local suite passed: 34 files, 230 tests.
- [x] Keep sizes as parameters inside their owning variant card in Add, Edit, and Manage. The
  storefront shows one chip per variant group, while the chosen size reaches the cart and order.

## Project 5 cards still shown as To-do

Checked rows have code evidence or a completed commit. Unchecked rows still need implementation
or a browser check before they can be called done.

| Done | Item | Work and evidence |
| --- | --- | --- |
| [ ] | `50620057` add-payment_with_klarma | Add and verify Klarna checkout. |
| [ ] | `38129130` add-filters_forProducts | Add usable catalog filters. |
| [ ] | `50365054` add-send_check_if_pay_with_metamask | Confirm MetaMask payment on the server. |
| [ ] | `38157163` imp_successAndErrorPages_gif_border | Check and improve success/error page borders. |
| [x] | `38739113` add-ProductTSX-requestReplanishment_button | `RequestReplanishmentButton.tsx`; commit `6df7ca66`. |
| [ ] | `38739199` add-support_route | Verify the support route and access rules. |
| [ ] | `38739690` imp-emailsUI | Review and improve email layouts. |
| [ ] | `38746339` imp-checkIsProductSillAvailable_onAndAfterPayment | Check stock before and after payment. |
| [ ] | `38795119` imp_shippingPrice | Calculate and show shipping cost. |
| [ ] | `38825658` imp-test | Define and finish the original test requirement. |
| [ ] | `38826032` fix-sendEmailToUnauthorizedUser_afterPayment | Verify receipt recipient authorization. |
| [ ] | `38886551` imp-convert&compressImages_onAddProduct | Convert and compress uploads. |
| [ ] | `38891456` add-authWithMetamask | Add and verify wallet sign-in. |
| [ ] | `37824584` root-fix-checkForRerenders | Measure and fix unnecessary rerenders. |
| [ ] | `38996859` fix-contrast | Audit and fix contrast. |
| [ ] | `39239429` add-guideForEnv | Document environment setup. |
| [ ] | `41549721` imp-NavbarTSX_logicForSearchIcon_onMobilesOnClick | Make mobile search usable. |
| [ ] | `41570759` imp-ProductsTSX_show_popularBuyed | Show popular products. |
| [ ] | `42039097` imp-initialPageLoadingSkeleton_matchWithUI | Match the initial skeleton to the catalog. |
| [ ] | `43098991` imp-languageTSX_BgContrast | Improve language menu contrast. |
| [ ] | `43549897` add-addProductFormTSX_imageContentValidation | Validate uploaded image content. |
| [x] | `44321008` imp-editProductFormTSX_updateImage | `FormatImagesForm` is in Admin Panel and manage page. |
| [x] | `44321199` fix-404_ifNoProductsFound | Search renders `NoProductsFound`. |
| [ ] | `44431956` imp-ctrlKModal_searchForEverything | Search all intended content from Ctrl+K. |
| [ ] | `44945114` add-feedback_inAvatarDropdown | Add a feedback route from the avatar menu. |
| [ ] | `45278958` fix-modalQueryConainer-performance | Check every query modal after commit `2af79a5a`. |
| [ ] | `50617299` add-payment_with_apple | Add and verify Apple Pay. |
| [ ] | `45390704` imp-auth-asyncValidation | Add async auth validation. |
| [ ] | `50280346` add-amount_of_requests_about_replanishment | Show replenishment request count. |
| [ ] | `43920647` fix_links_inEmail_notClickable | Check email links in an email client. |
| [ ] | `44296138` add-sendEmail_logic | An email route exists; review its unrestricted recipient input. |
| [x] | `43926133` imp-addProductFormTSX_focusInput_onTab | `useFocusVariantLabelAfterImageAdded` focuses the label. |
| [ ] | `44272829` add-cartModal_taxPrice | Calculate and show tax. |
| [ ] | `43712994` imp-cartModalTSX_showToastWarn_ifProductDeleted | Warn when a cart product was deleted. |
| [ ] | `54874121` imp-connection_withPusher | Verify realtime updates and reconnects. |
| [ ] | `74337206` fix-metamask-payment | Reproduce and fix wallet checkout. |
| [ ] | `150863183` AIChat - add 2 items to cart | Make a request for two distinct products add both. |
| [ ] | `156703635` upd: improve utm stats | Review the board screenshot and stats page. |
| [x] | `197001666` fix: text is draggable | File-only drag handling, commit `36a55087`. |
| [ ] | `197002041` fix: internet frash | Keep the mounted app usable after connection loss. |

The linked Project item `38740172 imp-authLogic` was already marked Done on GitHub when this
plan was created.
