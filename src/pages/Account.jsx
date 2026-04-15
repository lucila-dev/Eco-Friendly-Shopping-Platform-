import { useEffect } from 'react'
import AccountHubPanel from '../components/AccountHubPanel'

export default function Account() {
  useEffect(() => {
    document.title = 'Your account · EcoShop'
    return () => {
      document.title = 'EcoShop · Sustainable Shopping'
    }
  }, [])

  return (
    <div className="pb-8">
      <AccountHubPanel heading="h1" />
    </div>
  )
}
