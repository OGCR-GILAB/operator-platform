import { Route, Routes, useNavigate, useResolvedPath, useLocation, Navigate } from "react-router-dom";
import Header from "./components/header/Header";
import { Container } from "./components/ui/Layout";
import { useEffect, useRef, useState } from "react";
import { useGlobal } from "./components/providers/GlobalContext";
import Home from "./components/home/Home";
import Footer from "./components/ui/Footer";
import Content from "./components/content/Content";
import RouteTransition from "./components/ui/RouteTransition";
import LoadingScreen from "./components/ui/LoadingScreen";
import Overview from "./components/overview/Overview";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Profile from "./components/profile/Profile";
import Activities from "./components/projects/Projects";
import ActivityProvider from "./components/activity/ActivityProvider";
import ActivityWorkspace from "./components/activity/ActivityWorkspace";
import ActivityOverview from "./components/activity/ActivityOverview";
import ActivityPlans from "./components/activity/ActivityPlans";
import ActivityParcels from "./components/activity/ActivityParcels";
import ActivityDocuments from "./components/activity/ActivityDocuments";
import ActivityMap from "./components/activity/ActivityMap";
import NotFound from "./components/ui/NotFound";
import Title from "./components/header/Title";
import { Button, Tooltip } from "@majistudio/ogcr-design-system";
import { LockIcon, UserIcon } from "@phosphor-icons/react";
import Login from "./components/auth/Login";
import { useToast } from "./components/providers/ToastContext";
import SignUp from "./components/auth/SignUp";
import ValidateEmail from "./components/auth/ValidateEmail";
import OperatorSetupWizardModal from "./components/operator/OperatorSetupWizardModal";
import useSignOut from "./components/auth/useSignOut";
import $auth from "./services/$auth";

function Main() {
  const { loggedIn, me, operatorStatus, acknowledgeSessionExpiry } = useGlobal();

  const navigate = useNavigate();
  const signOut = useSignOut();
  const { showToast, clearToasts } = useToast();
  const { pathname } = useResolvedPath();
  const location = useLocation();

  /*
    What the page transition treats as a new destination. An activity's tabs
    animate inside the workspace, so from here /activities/42/parcels and
    /activities/42/documents are the same place and must not replay the entrance
    of the whole screen on every tab click.
  */
  const routeKey = location.pathname.replace(/^(\/activities\/[^/]+)(\/.*)?$/, "$1");

  const [loginModal, setLoginModal] = useState(false);
  const [registerModal, setRegisterModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [heroTitleAnimation, setHeroTitleAnimation] = useState(false);

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoading(false);
      setHeroTitleAnimation(true);
    }, 2200);

    const heroTimer = setTimeout(() => {
      setHeroTitleAnimation(false);
    }, 3400);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(heroTimer);
    };
  }, [])

  // A 401 on any call means the token is gone. GlobalProvider drops the session
  // state; this subscription owns the UI side of it — back to the entry page with
  // sign-in reopened, so the bounce is never silent.
  useEffect(() => $auth.onUnauthorized(() => {
    if (!loggedIn) return;

    navigate("/", { replace: true });
    clearToasts();
    showToast({
      variant: "warning",
      title: "Session expired",
      description: "You have been signed out. Please sign in again.",
    });
    setLoginModal(true);
    acknowledgeSessionExpiry();
  }), [loggedIn, navigate, clearToasts, showToast, acknowledgeSessionExpiry]);

  // Rate limiting and DCR outages hit every call in flight at once; one toast
  // per status every few seconds is enough to say what is going on.
  const lastServiceToast = useRef({});

  useEffect(() => $auth.onServiceError(({ status }) => {
    const now = Date.now();
    if (now - (lastServiceToast.current[status] || 0) < 5000) return;
    lastServiceToast.current[status] = now;

    showToast(status === 429
      ? {
        variant: "warning",
        title: "Too many requests",
        description: "Please try again in a minute.",
      }
      : {
        variant: "warning",
        title: "DCR is unreachable",
        description: "Please try again shortly.",
      });
  }), [showToast]);

  return (
    <>
      {loading && <LoadingScreen title="Operator Platform" statusText="Preparing operator workspace…" />}
      {!loading && (
        <div className="app-root pt-40">

          <Container className="pb-40 gap-8">
            <div className="flex flex-wrap justify-between items-center gap-8">
              <Title heroAnimation={heroTitleAnimation} />
              {
                !loggedIn ?
                  <Button onClick={() => {
                    setLoginModal(true);
                  }} iconLeft={<LockIcon />}>
                    Sign In / Sign Up
                  </Button>
                  :
                  <div className="flex flex-row items-center gap-4">
                    <Button onClick={() => navigate('/profile')} className="flex flex-row items-center gap-8" variant="text">

                      <UserIcon />
                      &nbsp;&nbsp;
                      <span>{me?.username}</span>

                    </Button>
                    <Tooltip
                      trigger={(
                        <Button iconOnly aria-label="Sign Out" variant="text" onClick={signOut} iconLeft={<LockIcon />} />
                      )}
                    >
                      Sign Out
                    </Tooltip>
                  </div>
              }
            </div>
            {/* <Title heroAnimation={heroTitleAnimation} /> */}
            {/*
              The provider wraps the sidebar as well as the routes: both read the
              selected activity, and it should only ever be fetched once.
            */}
            <ActivityProvider>
              {/* On phones the DS sidebar is a bar with a drawer, so it sits on top. */}
              <div className="flex flex-col sm:flex-row" style={{flex: '1 1 auto'}}>
                <Header />
                <Content>
                  <RouteTransition transitionKey={routeKey}>
                    <Routes>
                      <Route
                        index
                        element={loggedIn ? <Navigate to="/overview" /> : (
                          <Home onOpenLogin={() => setLoginModal(true)} onOpenRegister={() => setRegisterModal(true)} />
                        )}
                      />

                      {/* The confirmation link in DCR's e-mail; public by nature. */}
                      <Route
                        path="/validate-email"
                        element={<ValidateEmail onOpenLogin={() => setLoginModal(true)} />}
                      />

                      <Route element={<ProtectedRoute isAllowed={loggedIn} />}>
                        <Route path="/overview" element={<Overview />} />
                        <Route path="/profile" element={<Profile />} />

                        <Route path="/activities" element={<Activities />} />

                        {/*
                          Everything below belongs to one activity. Parcels,
                          documents and the map are reached through it and nowhere
                          else — that is what makes the process legible.
                        */}
                        <Route path="/activities/:activityId" element={<ActivityWorkspace />}>
                          <Route index element={<Navigate to="overview" replace />} />
                          <Route path="overview" element={<ActivityOverview />} />
                          <Route path="plans" element={<ActivityPlans />} />
                          <Route path="parcels" element={<ActivityParcels />} />
                          <Route path="documents" element={<ActivityDocuments />} />
                          <Route path="map" element={<ActivityMap />} />
                        </Route>

                        {/* Where the old top-level modules used to live. */}
                        <Route path="/parcels" element={<Navigate to="/activities" replace />} />
                        <Route path="/documents" element={<Navigate to="/activities" replace />} />
                        <Route path="/map" element={<Navigate to="/activities" replace />} />
                      </Route>

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </RouteTransition>
                </Content>
              </div>
            </ActivityProvider>
            <>
              {loginModal && <Login open={loginModal} onClose={() => setLoginModal(false)} onOpenRegister={() => {
                setLoginModal(false);
                setRegisterModal(true);
              }} />}

              {registerModal && <SignUp open={registerModal} onClose={() => setRegisterModal(false)} onOpenLogin={() => {
                setRegisterModal(false);
                setLoginModal(true);
              }} />}

              <OperatorSetupWizardModal isOpen={loggedIn && operatorStatus === 'missing'} />
            </>
          </Container>
          <Footer variant={pathname === '/' ? 'full' : 'compact'} />
        </div>
      )}

    </>
  )
}

export default Main;