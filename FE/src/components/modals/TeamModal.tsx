"use client";

import { useEffect, useId, useState } from "react";
import {
  teamApi,
  type TeamState,
  type TeamUser,
} from "@/api/real/notificationApi";
import { failureText, toApiError } from "@/api/errors";
import type { Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import {
  fieldClass,
  helpClass,
  inputClass,
  labelClass,
} from "@/components/ui/field";
import { MiniButton } from "@/components/ui/MiniButton";
import { Modal } from "@/components/ui/Modal";
import { useWt } from "@/providers/context";
import { modalActionButton, modalActionsClass } from "./modalStyles";

const MIN_QUERY = 2;

/**
 * 팀원 관리. 등록자와 수락한 팀원이 같은 권한으로 팀원을 초대하고 빼낸다.
 * 초대는 공개 아이디로 찾고, 받은 사람이 알림창에서 수락해야 팀원이 된다.
 */
export function TeamModal({ s, onClose }: { s: Service; onClose: () => void }) {
  const wt = useWt();
  const hid = useId();
  const fid = useId();
  const [team, setTeam] = useState<TeamState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [name, setName] = useState("");
  const [found, setFound] = useState<TeamUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    teamApi
      .team(s.id)
      .then((t) => {
        if (live) setTeam(t);
      })
      .catch(() => {
        if (live) setLoadFailed(true);
      });
    return () => {
      live = false;
    };
  }, [s.id, version]);

  // 입력한 아이디로 시작하는 회원을 찾아 보여 준다(입력을 멈춘 뒤에 조회한다)
  useEffect(() => {
    const q = name.trim();
    if (q.length < MIN_QUERY) {
      const clear = setTimeout(() => setFound([]), 0);
      return () => clearTimeout(clear);
    }
    let live = true;
    const t = setTimeout(() => {
      teamApi
        .candidates(s.id, q)
        .then((list) => {
          if (live) setFound(list);
        })
        .catch(() => {
          if (live) setFound([]);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [name, s.id, version]);

  const run = async (what: string, request: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await request();
      return true;
    } catch (e) {
      const err = toApiError(e);
      if (err.kind !== "auth") wt.toast(failureText(what, err), { err: true });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const reload = () => setVersion((v) => v + 1);

  const invite = async (username: string) => {
    if (!username.trim()) return;
    if (await run("초대하지", () => teamApi.invite(s.id, username.trim()))) {
      setName("");
      setFound([]);
      wt.toast("초대를 보냈어요. 받은 사람이 알림에서 수락하면 팀원이 돼요.");
      reload();
    }
  };
  const cancel = async (id: string) => {
    if (await run("초대를 취소하지", () => teamApi.cancel(s.id, id))) reload();
  };
  const remove = async (user: TeamUser) => {
    const self = user.id === wt.me?.id;
    if (
      !(await run(self ? "팀에서 나가지" : "팀원을 내보내지", () =>
        teamApi.remove(s.id, user.id),
      ))
    )
      return;
    await wt.reloadService(s.id);
    if (self) {
      // 더는 관리할 수 없는 서비스이므로 목록에서 빠졌다
      wt.toast("팀에서 나왔어요.");
      onClose();
      return;
    }
    wt.toast("팀원을 내보냈어요.");
    reload();
  };

  const people: { user: TeamUser; owner: boolean }[] = team
    ? [
        { user: team.owner, owner: true },
        ...team.members.map((m) => ({ user: m.user, owner: false })),
      ]
    : [];
  const full = !!team && team.members.length >= team.memberLimit;
  return (
    <Modal onClose={onClose} labelledBy={hid} width={480} locked={busy}>
      <h3 id={hid}>팀원 관리</h3>
      <p>
        <b className="text-ink">{s.name}</b>의 팀원은 등록자와 같은 권한으로
        서비스를 관리해요. 등록자를 뺀 팀원은 최대 {team?.memberLimit ?? 5}
        명이에요.
      </p>
      {loadFailed ? (
        <p className="mt-4 text-wine">팀 정보를 불러오지 못했어요.</p>
      ) : !team ? (
        <p className="mt-4 text-muted">불러오는 중…</p>
      ) : (
        <>
          <ul className="m-0 mt-4 list-none divide-y divide-light p-0">
            {people.map(({ user, owner }) => (
              <li key={user.id} className="flex items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1 truncate text-14">
                  <b className="text-ink">{user.nickname}</b>{" "}
                  <span className="text-muted">@{user.username}</span>
                </span>
                <span className="text-12 text-muted">
                  {owner ? "등록자" : "팀원"}
                </span>
                {(team.members.length > 0 || !owner) && (
                  <MiniButton
                    disabled={busy}
                    onClick={() => void remove(user)}
                    aria-label={`${user.nickname} ${user.id === wt.me?.id ? "나가기" : "내보내기"}`}
                  >
                    {user.id === wt.me?.id ? "나가기" : "내보내기"}
                  </MiniButton>
                )}
              </li>
            ))}
          </ul>
          {team.invitations.length > 0 && (
            <>
              <div className={`${labelClass} mt-5`}>초대 중</div>
              <ul className="m-0 mt-1 list-none divide-y divide-light p-0">
                {team.invitations.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-14">
                      <b className="text-ink">{i.invitee.nickname}</b>{" "}
                      <span className="text-muted">@{i.invitee.username}</span>
                    </span>
                    <MiniButton
                      disabled={busy}
                      onClick={() => void cancel(i.id)}
                    >
                      초대 취소
                    </MiniButton>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className={`${fieldClass} mt-5`}>
            <label className={labelClass} htmlFor={fid}>
              공개 아이디로 초대하기
            </label>
            <div className="flex gap-2">
              <input
                id={fid}
                className={inputClass}
                value={name}
                maxLength={30}
                disabled={busy || full}
                placeholder={
                  full ? "팀원이 가득 찼어요" : "예: apple.dev (2글자 이상)"
                }
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void invite(name);
                }}
              />
              <Button
                disabled={busy || full || !name.trim()}
                onClick={() => void invite(name)}
              >
                초대
              </Button>
            </div>
            {found.length > 0 && (
              <ul
                className="m-0 list-none rounded-md border border-border p-1"
                aria-label="검색 결과"
              >
                {found.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-14 hover:bg-light"
                      onClick={() => setName(u.username)}
                    >
                      <b className="text-ink">{u.nickname}</b>
                      <span className="text-muted">@{u.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className={helpClass}>
              받은 사람이 알림에서 수락해야 팀원이 돼요. 아이디가 같은 닉네임과
              헷갈리지 않게 공개 아이디로 찾아요.
            </p>
          </div>
        </>
      )}
      <div className={modalActionsClass}>
        <Button
          variant="ghost"
          className={modalActionButton}
          disabled={busy}
          onClick={onClose}
        >
          닫기
        </Button>
      </div>
    </Modal>
  );
}
