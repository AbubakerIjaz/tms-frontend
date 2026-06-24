import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

export interface WizardStep {
  id: string
  title: string
  description: string
}

interface SettingsWizardProps {
  steps: WizardStep[]
  currentStep: number
  onStepChange: (index: number) => void
  children: ReactNode
}

export function SettingsWizard({ steps, currentStep, onStepChange, children }: SettingsWizardProps) {
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <nav className="border-b border-slate-100 p-4 sm:p-6" aria-label="Settings steps">
          <ol className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0">
            {steps.map((step, index) => {
              const isActive = index === currentStep
              const isComplete = index < currentStep
              const isLast = index === steps.length - 1

              return (
                <li key={step.id} className={`flex flex-1 items-center ${isLast ? '' : 'sm:pr-4'}`}>
                  <button
                    type="button"
                    onClick={() => onStepChange(index)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                      isActive
                        ? 'bg-brand-50 ring-1 ring-brand-200'
                        : isComplete
                          ? 'hover:bg-slate-50'
                          : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm'
                          : isComplete
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isComplete ? <Check size={16} strokeWidth={2.5} /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold ${
                          isActive ? 'text-brand-900' : 'text-slate-800'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {step.description}
                      </span>
                    </span>
                  </button>
                  {!isLast && (
                    <div className="mx-3 hidden h-px flex-1 bg-slate-200 sm:block" aria-hidden />
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

export function WizardStepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 border-b border-slate-100 pb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}

interface WizardNavProps {
  currentStep: number
  totalSteps: number
  saving?: boolean
  onBack: () => void
  onContinue: () => void
  continueLabel?: string
}

export function WizardNav({
  currentStep,
  totalSteps,
  saving,
  onBack,
  onContinue,
  continueLabel,
}: WizardNavProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1
  const label = continueLabel ?? (isLast ? 'Save & finish' : 'Save & continue')

  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="secondary"
        onClick={onBack}
        disabled={isFirst || saving}
        className={`w-full sm:w-auto ${isFirst ? 'invisible' : ''}`}
      >
        Back
      </Button>
      <Button type="button" onClick={onContinue} disabled={saving} className="w-full sm:ml-auto sm:w-auto">
        {saving ? 'Saving...' : label}
      </Button>
    </div>
  )
}
