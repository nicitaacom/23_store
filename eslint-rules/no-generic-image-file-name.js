"use strict"

// A pasted image always arrives as image.png - the browser names every clipboard paste that, so the
// name says nothing about the image and every paste fights over the same one. A `new File([...],
// "image.png")` in our own code repeats that mistake on purpose: the second one uploaded either
// overwrites the first or is refused as a duplicate.
//
// The name has to come from something real instead:
//   a product image -> slug(title)-N.ext        app/functions/createProductHelpers.ts
//   a chat image    -> the moment it arrived    app/functions/support/image/getTimestampFileName.ts
//   a design        -> the buyer's own name     slugifyFileNameForBucket
//
// Only the `new File(bytes, name)` form is checked, because that is where our code invents a name.
// A `.name` read off a File the user picked is the real name and is left alone.
const GENERIC_FILE_NAME = /^(image|images|img|file|upload|photo|picture|screenshot|generated[_-]?image|blank|untitled|download|clipboard)(\s*\(\d+\))?(-|_)?\d*\.[a-z0-9]+$/i

module.exports = {
  "no-generic-image-file-name": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow inventing a generic image file name like image.png - name it after the title, the moment it arrived, or the file the user picked",
      },
      schema: [],
      messages: {
        genericFileName:
          'File name "{{fileName}}" says nothing about the image, and every upload would fight over it. Name it after something real - slug(title)-N for a product image, getTimestampFileName() for a chat paste, slugifyFileNameForBucket() for a file the user picked.',
      },
    },
    create(context) {
      return {
        NewExpression(node) {
          if (node.callee.type !== "Identifier" || node.callee.name !== "File") return

          const fileNameArgument = node.arguments[1]
          if (!fileNameArgument || fileNameArgument.type !== "Literal" || typeof fileNameArgument.value !== "string") return
          if (!GENERIC_FILE_NAME.test(fileNameArgument.value)) return

          context.report({
            node: fileNameArgument,
            messageId: "genericFileName",
            data: { fileName: fileNameArgument.value },
          })
        },
      }
    },
  },
}
