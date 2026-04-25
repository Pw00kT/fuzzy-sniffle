import { Route, Switch } from 'wouter'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import RecordMeeting from './pages/RecordMeeting'
import UploadAudio from './pages/UploadAudio'
import MeetingDetail from './pages/MeetingDetail'

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/record" component={RecordMeeting} />
        <Route path="/upload" component={UploadAudio} />
        <Route path="/meeting/:id" component={MeetingDetail} />
        <Route>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Page not found
          </div>
        </Route>
      </Switch>
    </Layout>
  )
}
