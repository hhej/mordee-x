'use client';

import { useState } from 'react';
import { UserRound, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  usePatientStore,
  DEFAULT_PERSONA,
  type Gender,
} from '@/stores/store-patient';
import {
  BLOOD_TYPES,
  COMMON_CONDITIONS_TH,
  COMMON_DRUG_ALLERGIES,
  type BloodType,
} from '@/lib/constants';

export function PatientPersonaPopover() {
  const persona = usePatientStore((s) => s.persona);
  const setPersona = usePatientStore((s) => s.setPersona);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(persona.name);
  const [age, setAge] = useState(persona.age);
  const [gender, setGender] = useState<Gender>(persona.gender);
  const [conditions, setConditions] = useState<string[]>(persona.conditions);
  const [allergies, setAllergies] = useState<string[]>(persona.allergies);
  const [medications, setMedications] = useState(persona.medications);
  const [weightKg, setWeightKg] = useState<number | null>(persona.weightKg);
  const [heightCm, setHeightCm] = useState<number | null>(persona.heightCm);
  const [bloodType, setBloodType] = useState<BloodType>(persona.bloodType);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName(persona.name);
      setAge(persona.age);
      setGender(persona.gender);
      setConditions(persona.conditions);
      setAllergies(persona.allergies);
      setMedications(persona.medications);
      setWeightKg(persona.weightKg);
      setHeightCm(persona.heightCm);
      setBloodType(persona.bloodType);
    }
    setOpen(next);
  };

  const trimmedName = name.trim();
  const nameValid = trimmedName.length > 0;
  const ageValid = Number.isFinite(age) && age >= 1 && age <= 120;
  const canSave = nameValid && ageValid;

  const onSave = () => {
    if (!canSave) return;
    setPersona({
      name: trimmedName,
      age,
      gender,
      conditions,
      allergies,
      medications,
      weightKg,
      heightCm,
      bloodType,
    });
    setOpen(false);
  };

  const onReset = () => {
    setName(DEFAULT_PERSONA.name);
    setAge(DEFAULT_PERSONA.age);
    setGender(DEFAULT_PERSONA.gender);
    setConditions(DEFAULT_PERSONA.conditions);
    setAllergies(DEFAULT_PERSONA.allergies);
    setMedications(DEFAULT_PERSONA.medications);
    setWeightKg(DEFAULT_PERSONA.weightKg);
    setHeightCm(DEFAULT_PERSONA.heightCm);
    setBloodType(DEFAULT_PERSONA.bloodType);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs text-foreground ring-1 ring-border/70 transition-colors hover:bg-mint-50 dark:hover:bg-mint-500/10 hover:ring-mint-300 dark:hover:ring-mint-500/30"
            title="แก้ไขข้อมูลผู้ป่วย"
          >
            <UserRound className="size-3.5 text-mint-700 dark:text-mint-400" />
            {persona.name}
            <span className="text-muted-foreground">
              · {persona.age} · {persona.gender === 'F' ? 'ญ' : 'ช'}
            </span>
          </button>
        )}
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex max-h-[min(80vh,38rem)] w-[22rem] flex-col p-0"
      >
        <div className="border-b border-border/60 px-4 pt-4 pb-3">
          <div className="text-sm font-semibold text-foreground">ข้อมูลผู้ป่วย</div>
          <div className="text-[11px] text-muted-foreground">
            ใช้เป็นข้อมูลในการประเมินอาการ · เก็บไว้ในเครื่องคุณเท่านั้น
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {/* Section: Basics */}
          <div className="space-y-3">
            <SectionLabel>ข้อมูลพื้นฐาน · Basics</SectionLabel>
            <Field label="ชื่อ" labelEn="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!nameValid}
                className="w-full rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-sm outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50 aria-invalid:border-triage-red/60 aria-invalid:focus:ring-triage-red/20"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="อายุ" labelEn="Age">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={Number.isFinite(age) ? age : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setAge(raw === '' ? NaN : Number(raw));
                  }}
                  aria-invalid={!ageValid}
                  className="w-full rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-sm outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50 aria-invalid:border-triage-red/60 aria-invalid:focus:ring-triage-red/20"
                />
              </Field>
              <Field label="เพศ" labelEn="Gender">
                <div className="flex gap-1.5">
                  <Chip active={gender === 'M'} onClick={() => setGender('M')}>ชาย</Chip>
                  <Chip active={gender === 'F'} onClick={() => setGender('F')}>หญิง</Chip>
                </div>
              </Field>
            </div>
          </div>

          {/* Section: Health profile */}
          <div className="space-y-3 border-t border-border/60 pt-3">
            <SectionLabel>ข้อมูลสุขภาพ · Health profile</SectionLabel>

            <Field label="โรคประจำตัว" labelEn="Underlying diseases">
              <ChipMultiSelect
                value={conditions}
                onChange={setConditions}
                presets={COMMON_CONDITIONS_TH.map((c) => ({ value: c.th, label: c.th, sub: c.en }))}
                customPlaceholder="เพิ่มโรคอื่น..."
              />
            </Field>

            <Field label="แพ้ยา" labelEn="Drug allergies">
              <ChipMultiSelect
                value={allergies}
                onChange={setAllergies}
                presets={COMMON_DRUG_ALLERGIES.map((d) => ({ value: d, label: d }))}
                customPlaceholder="เพิ่มยาที่แพ้..."
              />
            </Field>

            <Field label="ยาที่ใช้ปัจจุบัน" labelEn="Current medications">
              <textarea
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                rows={2}
                placeholder="เช่น metformin 500mg เช้า-เย็น"
                className="w-full resize-none rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-xs outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="น้ำหนัก" labelEn="Weight">
                <SuffixInput
                  value={weightKg}
                  onChange={setWeightKg}
                  min={1}
                  max={500}
                  suffix="kg"
                />
              </Field>
              <Field label="ส่วนสูง" labelEn="Height">
                <SuffixInput
                  value={heightCm}
                  onChange={setHeightCm}
                  min={30}
                  max={260}
                  suffix="cm"
                />
              </Field>
            </div>

            <Field label="กรุปเลือด" labelEn="Blood type">
              <div className="grid grid-cols-4 gap-1.5">
                {BLOOD_TYPES.map((bt) => (
                  <Chip key={bt} active={bloodType === bt} onClick={() => setBloodType(bt)}>
                    {bt}
                  </Chip>
                ))}
                <Chip
                  active={bloodType === 'unknown'}
                  onClick={() => setBloodType('unknown')}
                  className="col-span-4"
                >
                  ไม่ทราบ · Unknown
                </Chip>
              </div>
            </Field>
          </div>
        </div>

        <div className="border-t border-border/60 px-4 pt-3 pb-4">
          {!canSave ? (
            <div className="mb-2 text-[11px] text-triage-red">
              {!nameValid
                ? 'กรุณากรอกชื่อ · Name required'
                : 'อายุต้องอยู่ระหว่าง 1–120 · Age 1–120'}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onReset}>
              ใช้ค่าตั้งต้น
            </Button>
            <Button size="sm" onClick={onSave} disabled={!canSave}>
              บันทึก
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wide text-mint-800">
      {children}
    </div>
  );
}

function Field({
  label,
  labelEn,
  children,
}: {
  label: string;
  labelEn: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label} <span className="text-muted-foreground/70">· {labelEn}</span>
      </div>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
        active
          ? 'border-mint-400 bg-mint-50 dark:bg-mint-500/10 text-mint-900 dark:text-mint-200'
          : 'border-border/70 bg-card text-muted-foreground hover:border-mint-200'
      } ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

function ChipMultiSelect({
  value,
  onChange,
  presets,
  customPlaceholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  presets: Array<{ value: string; label: string; sub?: string }>;
  customPlaceholder: string;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v || value.includes(v)) {
      setCustomInput('');
      setCustomMode(false);
      return;
    }
    onChange([...value, v]);
    setCustomInput('');
    setCustomMode(false);
  };

  const presetValues = new Set(presets.map((p) => p.value));
  const customSelected = value.filter((v) => !presetValues.has(v));

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => toggle(p.value)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              value.includes(p.value)
                ? 'border-mint-400 bg-mint-50 dark:bg-mint-500/10 text-mint-900 dark:text-mint-200'
                : 'border-border/70 bg-card text-muted-foreground hover:border-mint-200'
            }`}
            title={p.sub}
          >
            {p.label}
          </button>
        ))}
        {customSelected.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md border border-mint-400 bg-mint-50 dark:bg-mint-500/10 px-2 py-1 text-xs text-mint-900 dark:text-mint-200"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="text-mint-700 dark:text-mint-400 hover:text-mint-900"
              aria-label={`Remove ${v}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      {customMode ? (
        <div className="flex gap-1.5">
          <input
            autoFocus
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              } else if (e.key === 'Escape') {
                setCustomInput('');
                setCustomMode(false);
              }
            }}
            onBlur={addCustom}
            placeholder={customPlaceholder}
            className="flex-1 rounded-md border border-border/70 bg-card px-2 py-1 text-xs outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className="text-[11px] text-mint-700 dark:text-mint-400 hover:text-mint-900"
        >
          + อื่นๆ
        </button>
      )}
    </div>
  );
}

function SuffixInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  suffix: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-card pr-2 focus-within:border-mint-400 focus-within:ring-2 focus-within:ring-mint-200/50">
      <input
        type="number"
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(null);
            return;
          }
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className="w-full rounded-md bg-transparent px-2.5 py-1.5 text-sm outline-none"
      />
      <span className="text-[11px] text-muted-foreground">{suffix}</span>
    </div>
  );
}
