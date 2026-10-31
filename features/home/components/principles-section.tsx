import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles, Zap } from "lucide-react";

export function PrinciplesSection() {
  return (
    <section className="principles page-width" id="principles">
      <div className="principles-intro">
        <h2>
          Less in your way.
          <br />
          More in your flow.
        </h2>
        <p>
          A useful tool should feel simple. So we’re building a toolkit that gets out of
          your way and lets you get on with it.
        </p>
        <Link href="/tools/json-formatter" className="button lime-button">
          Find your flow <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="principles-list">
        <div>
          <span className="principle-icon">
            <ShieldCheck size={21} />
          </span>
          <h3>Your input. Your business.</h3>
          <p>
            Local utilities process your input on your device. IP inspection explains its
            network requests before you use its lookup and WebRTC checks.
          </p>
        </div>
        <div>
          <span className="principle-icon">
            <Zap size={21} />
          </span>
          <h3>Straight to the useful part.</h3>
          <p>
            No accounts, subscriptions, or hoops. Just the tool you need, when you need
            it.
          </p>
        </div>
        <div>
          <span className="principle-icon">
            <Sparkles size={21} />
          </span>
          <h3>A calmer kind of toolkit.</h3>
          <p>Considered details, familiar shortcuts, and a little more room to think.</p>
        </div>
      </div>
    </section>
  );
}
