import Link from "next/link";
import { LucideIcon, ArrowRight } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface StepsCardProps {
  title: string;
  icon: LucideIcon;
  steps: Step[];
  bgColor: "light" | "dark";
  buttonText: string;
  href: string;
}

export default function StepsCard({
  title,
  icon: Icon,
  steps,
  bgColor,
  buttonText,
  href,
}: StepsCardProps) {
  const isDark = bgColor === "dark";

  return (
    <div
      className={`rounded-2xl p-8 shadow-sm ${
        isDark ? "bg-[#192F59]" : "bg-white border border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 mb-8">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isDark ? "bg-white/10" : "bg-blue-50"
          }`}
        >
          <Icon className={`w-5 h-5 ${isDark ? "text-white" : "text-[#192F59]"}`} />
        </div>
        <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-[#192F59]"}`}>
          {title}
        </h3>
      </div>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          return (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-[#E67E22] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-px flex-1 min-h-[2rem] my-1 ${
                      isDark ? "bg-white/10" : "bg-gray-100"
                    }`}
                  />
                )}
              </div>
              <div className="pb-6 pt-1">
                <div
                  className={`flex items-center gap-2 mb-1 ${
                    isDark ? "text-white" : "text-[#192F59]"
                  }`}
                >
                  <StepIcon className="w-5 h-5" />
                  <h4 className="font-semibold text-sm">{step.title}</h4>
                </div>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href={href}
        className={`inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-colors ${
          isDark
            ? "bg-[#E67E22] hover:bg-[#D35400] text-white"
            : "bg-[#192F59] hover:bg-[#1a3570] text-white"
        }`}
      >
        {buttonText} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
