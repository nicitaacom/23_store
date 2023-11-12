## When you should use utils folder

If you create something not related to some dependency from `package.json`
For examples see files in this folder

## Usage for currencyFormatter

This file needed to format price from `199999.99` to this `$1,999,99.99`

## Usage for formatDeliveryDate

This file needed to add 3 days from current date and one more day if Saturday
and get output from this 11/24/2023 to this 24.11.2023

## Usage for formatMetamaskBalance

This file needed to fomat metamask balance
(I copy pasted this file from [this guide](https://docs.metamask.io/wallet/tutorials/react-dapp-local-state/#5-manage-more-metamask-state))

## Usage for formatTime

This function turns this `2023-11-12T08:41:03.348842+00:00` into `09:41`

## Usage for getStorage

Just incaplulated logic to do stuff related to getting and setting cart
You may find how logic for user's cart works - in `app/(site)/dev_readme.md`

## Usage for helpers

Any helpers you need - I created getURL because Antonio use the same setup
to create-checkout-session in [spotify clone](https://youtu.be/2aeMRB8LL4o?t=18271)
