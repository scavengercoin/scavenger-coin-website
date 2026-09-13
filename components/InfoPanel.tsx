const FAQS = [
  {
    q: "What is $SCAV?",
    a: "SCAV is the token behind Scavenger Coin — a real crypto scavenger hunt across NYC. Each week a physical coin is hidden somewhere in the city. Whoever finds it and scans the QR code claims SCAV tokens straight to their wallet.",
  },
  {
    q: "What is a Solana wallet?",
    a: "A Solana wallet is an app that holds your crypto and lets you sign transactions. It's free to set up and takes about a minute — you don't need to buy anything to receive SCAV.",
  },
  {
    q: "How do I set up Phantom?",
    a: "Download Phantom from phantom.app (or your phone's app store), create a new wallet, and save your recovery phrase somewhere safe. Then come back here, hit \"Select Wallet,\" and connect.",
  },
] as const;

export function InfoPanel() {
  return (
    <div className="w-full max-w-sm space-y-2 text-left">
      {FAQS.map((item) => (
        <details
          key={item.q}
          className="group rounded-lg border border-[#2A2A2A] bg-[#141414] px-4 py-3 open:pb-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-[#F0EDE8]">
            {item.q}
            <span className="ml-2 text-[#F5C518] transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-[#F0EDE8]/60">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
