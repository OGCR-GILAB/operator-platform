import { Logo } from "@majistudio/ogcr-design-system";

function Title({ heroAnimation = false }) {
  return (
    <div className={`title-hero flex flex-row flex-wrap items-center gap-20 mb-20 ${heroAnimation ? "title-hero--enter" : ""}`.trim()}>
      <Logo width={250} className="title-hero__logo" />
      <h1 className="page__title">Operator <span className="page__title-accent">Platform</span></h1>
    </div>
  )
}
export default Title;