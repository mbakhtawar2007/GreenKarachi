import { Link } from 'react-router-dom';

const features = [
  {
    to: '/marketplace',
    icon: '🌱',
    title: 'Browse Plants',
    text: 'Explore available plants from nurseries across Karachi, with per-plant PKR pricing and stock levels.',
    cta: 'Open the marketplace',
  },
  {
    to: '/collaboration',
    icon: '🤝',
    title: 'Nursery Collaboration',
    text: 'Create supply-gap requests and coordinate with other nurseries to fulfil large orders together.',
    cta: 'See how collaboration works',
  },
  {
    to: '/projects',
    icon: '💚',
    title: 'Plantation Projects',
    text: 'Organize plantation drives and connect them with donors and investors who want to support them.',
    cta: 'Explore projects',
  },
];

const steps = [
  {
    title: 'Browse & request a quote',
    text: 'Find plants in the marketplace and send a quotation request with the quantities you need.',
  },
  {
    title: 'Nurseries respond — and team up',
    text: 'Nurseries reply with quotes. Short on stock? They open a supply-gap request and other nurseries offer the rest.',
  },
  {
    title: 'Confirm the order',
    text: 'Accept a quote to confirm the order, then coordinate the details directly with the nursery through messages.',
  },
];

const HomePage: React.FC = () => {
  return (
    <div className="space-y-16 pb-4 sm:space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-950 via-green-900 to-green-700 px-6 py-14 text-white shadow-lift sm:px-10 sm:py-16 lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 right-40 h-64 w-64 rounded-full bg-green-400/10" aria-hidden="true" />
        <div className="relative min-w-0 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-green-100">
            🌿 B2B plant marketplace · Karachi
          </span>
          <h1 className="mt-6 text-balance break-words text-4xl font-bold leading-[1.08] text-white min-[480px]:text-5xl lg:text-6xl">
            Connecting plant buyers &amp; nursery owners
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-green-100/90">
            GreenKarachi brings buyers, businesses, nursery owners, plantation organizers, donors and
            investors together in one marketplace — built around nurseries helping each other fulfil
            every order.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/marketplace" className="btn-light px-6 py-3 text-base">
              Browse the marketplace
            </Link>
            <Link to="/register" className="btn-outline-light px-6 py-3 text-base">
              Join as a nursery
            </Link>
          </div>
          <ul className="mt-9 flex flex-wrap gap-2 text-xs font-medium text-green-100/90">
            {['Buyers & businesses', 'Nursery owners', 'Plantation organizers', 'Donors & investors'].map((role) => (
              <li key={role} className="rounded-full border border-white/20 px-3 py-1.5">
                {role}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section aria-label="What you can do">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.to}
              to={feature.to}
              className="group card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-7"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-100 text-2xl" aria-hidden="true">
                {feature.icon}
              </div>
              <h2 className="mt-5 text-[1.35rem] font-semibold text-green-950">{feature.title}</h2>
              <p className="mt-2 leading-relaxed text-gray-600">{feature.text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-800">
                {feature.cta}
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section aria-label="How GreenKarachi works">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-green-700">How it works</p>
          <h2 className="mt-2 text-balance text-3xl font-bold text-green-950 lg:text-4xl">From quote to confirmed order</h2>
        </div>
        <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="card p-6 sm:p-7">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-green-800 font-display text-lg font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-green-950">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-gray-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Supply-gap explainer */}
      <section className="overflow-hidden rounded-[2rem] bg-green-900 text-white shadow-lift">
        <div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-2 lg:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-green-300">Our difference</p>
            <h2 className="mt-2 text-balance text-3xl font-bold text-white lg:text-4xl">No nursery has to turn down a big order</h2>
            <p className="mt-4 leading-relaxed text-green-100/90">
              When an order is bigger than one nursery's stock, the nursery opens a supply-gap request for
              just the missing quantity. Other nurseries offer their available stock, and only accepted
              offers count toward the order — so everyone can see exactly what is still needed.
            </p>
            <Link to="/collaboration" className="btn-light mt-7">
              Open collaboration
            </Link>
          </div>
          <div className="flex items-center">
            <dl className="grid w-full grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/10 p-4 sm:p-5">
                <dt className="text-xs font-semibold uppercase tracking-wider text-green-200">Needed</dt>
                <dd className="mt-1 font-display text-3xl font-bold sm:text-4xl">100</dd>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 sm:p-5">
                <dt className="text-xs font-semibold uppercase tracking-wider text-green-200">In stock</dt>
                <dd className="mt-1 font-display text-3xl font-bold sm:text-4xl">60</dd>
              </div>
              <div className="rounded-2xl bg-green-400/25 p-4 ring-1 ring-green-300/40 sm:p-5">
                <dt className="text-xs font-semibold uppercase tracking-wider text-green-100">Gap to fill</dt>
                <dd className="mt-1 font-display text-3xl font-bold sm:text-4xl">40</dd>
              </div>
              <p className="col-span-3 text-sm text-green-200/80">
                Example: a nursery that needs 100 plants but holds 60 asks the network for the remaining 40.
              </p>
            </dl>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="text-center">
        <h2 className="text-balance text-3xl font-bold text-green-950 lg:text-4xl">Running a nursery in Karachi?</h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-gray-600">
          List your plants, receive quotation requests, and collaborate with other nurseries on orders
          too big to fulfil alone.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary px-6 py-3 text-base">
            Create a free account
          </Link>
          <Link to="/nursery-directory" className="btn-secondary px-6 py-3 text-base">
            Browse the nursery directory
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
