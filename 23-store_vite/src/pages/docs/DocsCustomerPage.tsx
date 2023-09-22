import { Button } from "../../components/ui";
import docsCustomer from "./customer";

export function DocsCustomerPage () {
return (
   <section>
      <h1 className="text-center text-3xl mb-4">Choose docs you want to read</h1>

        <ul>
          {docsCustomer.map(doc => (
            <Button variant='link' href={doc.url}>{doc.title}</Button>
          ))}
        </ul>
    </section>
)
}