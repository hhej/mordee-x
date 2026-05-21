'use client';

import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { usePatientStore, type Gender } from '@/stores/store-patient';

export function PatientPersonaPopover() {
  const persona = usePatientStore((s) => s.persona);
  const setPersona = usePatientStore((s) => s.setPersona);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(persona.name);
  const [age, setAge] = useState(persona.age);
  const [gender, setGender] = useState<Gender>(persona.gender);
  const [history, setHistory] = useState(persona.history);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName(persona.name);
      setAge(persona.age);
      setGender(persona.gender);
      setHistory(persona.history);
    }
    setOpen(next);
  };

  const onSave = () => {
    setPersona({ name, age, gender, history });
    setOpen(false);
  };

  const onReset = () => {
    setName('คุณ Pol');
    setAge(28);
    setGender('M');
    setHistory('');
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-ink ring-1 ring-line/70 transition-colors hover:bg-mint-50 hover:ring-mint-300"
            title="แก้ไขข้อมูลผู้ป่วย"
          >
            <UserRound className="size-3.5 text-mint-700" />
            {persona.name}
            <span className="text-muted-foreground">
              · {persona.age} · {persona.gender === 'F' ? 'ญ' : 'ช'}
            </span>
          </button>
        )}
      />
      <PopoverContent align="end" sideOffset={8} className="w-80">
        <div className="mb-3">
          <div className="text-sm font-semibold text-ink">ข้อมูลผู้ป่วย</div>
          <div className="text-[11px] text-muted-foreground">
            ใช้เป็นข้อมูลในการประเมินอาการ · เก็บไว้ในเครื่องคุณเท่านั้น
          </div>
        </div>
        <div className="space-y-3">
          <Field label="ชื่อ" labelEn="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-line/70 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="อายุ" labelEn="Age">
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-line/70 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50"
              />
            </Field>
            <Field label="เพศ" labelEn="Gender">
              <div className="flex gap-1.5">
                <GenderChip value="M" current={gender} onSelect={setGender}>ชาย</GenderChip>
                <GenderChip value="F" current={gender} onSelect={setGender}>หญิง</GenderChip>
              </div>
            </Field>
          </div>
          <Field label="ประวัติย่อ" labelEn="History (optional)">
            <textarea
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              rows={2}
              placeholder="เช่น เบาหวาน · ภูมิแพ้ละอองเกสร · ทานยา..."
              className="w-full resize-none rounded-md border border-line/70 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50"
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onReset}>
            ใช้ค่าตั้งต้น
          </Button>
          <Button size="sm" onClick={onSave}>
            บันทึก
          </Button>
        </div>
      </PopoverContent>
    </Popover>
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

function GenderChip({
  value,
  current,
  onSelect,
  children,
}: {
  value: Gender;
  current: Gender;
  onSelect: (g: Gender) => void;
  children: React.ReactNode;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
        active
          ? 'border-mint-400 bg-mint-50 text-mint-900'
          : 'border-line/70 bg-white text-muted-foreground hover:border-mint-200'
      }`}
    >
      {children}
    </button>
  );
}
