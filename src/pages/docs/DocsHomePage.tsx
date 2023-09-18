import {BsCodeSlash} from 'react-icons/bs'
import {BiUser} from 'react-icons/bi'

import { Button } from "../../components/ui";

export function DocsHomePage () {
return (
    <section>
      <h1 className="text-center text-3xl mb-4">Choose docs you want to read</h1>

      <div className="flex flex-col gap-y-4 w-fit mx-auto">
        <Button className="flex flex-row gap-x-2" variant='info-outline' href="/docs/developer">
         For developer
         <BsCodeSlash/>
        </Button>

        <Button className="flex flex-row gap-x-2" variant='info-outline' href="/docs/customer">
          For customer
          <BiUser/>
        </Button>
      </div>
    </section>
)
}