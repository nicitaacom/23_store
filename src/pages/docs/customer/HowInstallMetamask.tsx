import {AiOutlineChrome} from 'react-icons/ai'
import {DiFirefox} from 'react-icons/di'
import {BiLogoOpera} from 'react-icons/bi'
import {BsBrowserEdge} from 'react-icons/bs'
import {SiSafari} from 'react-icons/si'

import { Button } from "../../../components/ui";

import { useLocation } from "react-router"

export function HowInstallMetamask () {

  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const browser = queryParams.get("browser")

return (
    <article className="flex flex-col gap-y-8">
      <nav className="grid grid-cols-1 tablet:grid-cols-3 laptop:flex flex-row gap-4 pb-8">
        <Button href="?browser=chrome" className="flex flex-row gap-x-2 h-[42px]" variant='default-outline'>Chrome <AiOutlineChrome size={28}/></Button>
        <Button href="?browser=firefox" className="flex flex-row gap-x-2 h-[42px]" variant='default-outline'>Firefox <DiFirefox size={30}/></Button>
        <Button href="?browser=opera" className="flex flex-row gap-x-2 h-[42px]" variant='default-outline'>Opera <BiLogoOpera size={24}/></Button>
        <Button href="?browser=microsoft-edge" className="flex flex-row gap-x-2 h-[42px]" variant='default-outline'>Microsoft Edge <BsBrowserEdge size={20}/></Button>
        <Button href="?browser=safari" className="flex flex-row gap-x-2 h-[42px]" variant='default-outline'>Safari <SiSafari size={20}/></Button>
      </nav>

      <header>
      <h1 className="text-center text-3xl">How to install metamask in {browser === 'chrome' ? 'Chrome'
      : browser === 'firefox' ? 'Firefox'
      : browser === 'opera' ? 'Opera'
      : browser === 'microsoft-edge' ? 'Microsoft Edge'
      : browser === 'safari' ? 'Safari' : 'Chrome'}</h1>
      <p className="text-center">Alternatively you can follow <Button className="inline w-fit text-info" variant='link' active='active'
      target="_blank" href="https://www.youtube.com/watch?v=DGpxGj6AsjQ&ab_channel=HowtoEssential">this </Button> guide</p>
      </header>

      
    
      {browser === 'chrome' || !browser &&
      <>
        <section>
      <h2 className="text-2xl">Step 1</h2>
      <h3>Go <Button className="inline w-fit text-info" variant='link' active='active'
         href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?utm_source=ext_app_menu">here </Button>
         or click 3 dots on right side of your borwser</h3>
         <img src='/docs/customer/how-to-install-metamask/step-1.png' alt="how-to-install-metamask"/>
      </section>


      <section>
      <h2 className="text-2xl">Step 2</h2>
      <h3>Type Metamask - select first one result - click install (blue button)</h3>
         <img src='/docs/customer/how-to-install-metamask/step-2.jpg' alt="how-to-install-metamask"/>
      </section>



      <section>
        <h2 className="text-2xl">Step 3</h2>
        <h3>Now simply follow instructions to create your wallet</h3> 
      </section>
      </>}

    </article>
)
}