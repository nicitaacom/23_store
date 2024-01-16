## How to create email

Use `CheckEmail.tsx` example and every time send request to send email to previrew it because preview in react-email works not properly
and you may got different email from that you saw in react-email preview

I reccomend you to do it with `<table>` `<tbody>` `<tr>` `<td>` rather then with `<div>`

You may check examples to get understanding how it works - https://react.email/examples

Also I want add that breackpoints in emails doesn't work that's why you need create it for mobile view

If you are new to `react-email` and `resend` - check guides on YouTube how to send email with react

### To make it flex-col use this construction

```tsx
<table>
  <tr>
    <td>
      <Text className="m-0 pb-8 text-subTitle text-center">Some content here</Text>
    </td>
  </tr>
</table>
```

**Or just put in section something**

```tsx
<Section className="border-[1px] border-solid border-border-color pb-0 mb-2" key={product.id}>
  <Img style={{ objectFit: "cover" }} src={product.img_url[0]} width="480" height="240" alt={product.title} />
  <Text className="m-0 px-4 py-2 text-title text-2xl text-center">{product.title}</Text>
  <Text className="mb-8 mt-0 text-title text-xl text-center">{formatCurrency(product.price)}</Text>
  <Text className="m-0 text-title text-lg text-center">
    Quantity:
    <span className="m-0 text-subTitle">{product.quantity}</span>{" "}
  </Text>
  <Text className="m-0 text-title text-lg text-center">
    Sub-total:
    <span className="m-0 text-subTitle">{formatCurrency(product.price * product.quantity)}</span>
  </Text>
</Section>
```

To make it flex-row write in body like (when I did like so I had flex-row)

```tsx
  <Body className="bg-[#202020]">
      {/* CONTENT - START */}

        {/* HEADER */}
         <Column align="center">
             <Heading className="m-0 pt-8 text-title text-center">{previewText}</Heading>
             <Text className="m-0 pb-8 text-subTitle text-center">Your order will delivered on {deliveryDate}  🗓</Text>
          </Column>
```

By `flex-row` and flex-col I don't mean exact classes that you see in dev tools
I mean only how it looks like because you may don't use flex at all and chieve `flex-row` `flex-col` result
