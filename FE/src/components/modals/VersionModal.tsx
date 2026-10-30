"use client";

import { useId, useState } from "react";
import type { Service, Version } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { boxClass } from "@/components/ui/box";
import {
  fieldClass,
  helpClass,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/ui/field";
import { Icon } from "@/components/ui/Icon";
import { MiniButton } from "@/components/ui/MiniButton";
import { Modal } from "@/components/ui/Modal";
import { fmtDate } from "@/domain/format";
import { DISPLAY } from "@/domain/policy";
import { useWt } from "@/providers/context";

type Draft = {
  id?: string;
  ver: string;
  title: string;
  body: string;
  date?: string;
};

/* 버전 기록 관리 (추가·수정·삭제) */
function VersionManager({ s }: { s: Service }) {
  const wt = useWt();
  const fid = useId();
  const [edit, setEdit] = useState<Draft | null>(null);
  const list = s.versions;
  const save = async () => {
    if (!edit) return;
    const v = {
      ...edit,
      ver: edit.ver.trim(),
      title: edit.title.trim(),
      body: edit.body.trim(),
    };
    try {
      if (v.id)
        await wt.updateService(s.id, {
          versions: list.map((x) =>
            x.id === v.id ? ({ ...x, ...v } as Version) : x,
          ),
        });
      else
        await wt.updateService(s.id, {
          versions: [
            { ...v, id: "v" + Date.now(), date: DISPLAY.demoToday },
            ...list,
          ],
        });
      setEdit(null);
      wt.toast(v.id ? "버전 기록을 수정했어요." : "버전 기록을 추가했어요.");
    } catch {
      wt.toast("버전 기록을 저장하지 못했어요.", { err: true });
    }
  };
  return (
    <div className="flex flex-col gap-3">
      {edit ? (
        <div className={`${boxClass} flex flex-col gap-2.5 bg-[#fbfaf7] p-4`}>
          <div className="grid grid-cols-[120px_1fr] gap-4">
            <div className={fieldClass}>
              <label className={labelClass} htmlFor={fid + "v"}>
                버전
              </label>
              <input
                id={fid + "v"}
                className={inputClass}
                value={edit.ver}
                onChange={(e) => setEdit({ ...edit, ver: e.target.value })}
                placeholder="1.2.0"
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass} htmlFor={fid + "t"}>
                제목
              </label>
              <input
                id={fid + "t"}
                className={inputClass}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="무엇이 바뀌었나요?"
              />
            </div>
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor={fid + "b"}>
              내용
            </label>
            <textarea
              id={fid + "b"}
              className={textareaClass}
              style={{ minHeight: 72 }}
              value={edit.body}
              onChange={(e) => setEdit({ ...edit, body: e.target.value })}
            />
          </div>
          <p className={helpClass}>
            일자는{" "}
            {edit.id
              ? "처음 등록한 일시가 유지돼요."
              : "등록하는 시각으로 자동 입력돼요."}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEdit(null)}>
              취소
            </Button>
            <Button
              size="sm"
              disabled={!edit.ver.trim() || !edit.title.trim()}
              onClick={save}
            >
              {edit.id ? "수정 완료" : "추가"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setEdit({ ver: "", title: "", body: "" })}
        >
          <Icon name="plus" size={14} />
          버전 추가
        </Button>
      )}
      <div>
        {list.length === 0 && (
          <p className={`${helpClass} py-3`}>아직 버전 기록이 없어요.</p>
        )}
        {list.map((v) => (
          <div
            key={v.id}
            className="grid grid-cols-[1fr_auto] items-start gap-2 border-t border-light py-2.5 text-13"
          >
            <div>
              <b className="font-mono text-13">{v.ver}</b> · <b>{v.title}</b>
              <div className="text-muted">{v.body}</div>
              <div className="font-mono text-11 text-muted">
                {fmtDate(v.date)}
              </div>
            </div>
            <div className="flex">
              <MiniButton
                onClick={() => setEdit({ ...v })}
                aria-label={`${v.ver} 수정`}
              >
                <Icon name="edit" size={14} />
                수정
              </MiniButton>
              <MiniButton
                aria-label={`${v.ver} 삭제`}
                onClick={async () => {
                  try {
                    await wt.updateService(s.id, {
                      versions: list.filter((x) => x.id !== v.id),
                    });
                    wt.toast("버전 기록을 삭제했어요.");
                  } catch {
                    wt.toast("버전 기록을 삭제하지 못했어요.", { err: true });
                  }
                }}
              >
                <Icon name="trash" size={14} />
                삭제
              </MiniButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VersionModal({
  s,
  onClose,
}: {
  s: Service;
  onClose: () => void;
}) {
  const hid = useId();
  return (
    <Modal onClose={onClose} labelledBy={hid} width={600}>
      <h3 id={hid}>버전 기록 관리</h3>
      <p className="mb-4">{s.name} · 상세 페이지 하단에 조용히 표시돼요.</p>
      <VersionManager s={s} />
    </Modal>
  );
}
