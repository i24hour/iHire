export const CHAIN_VISIT_WINDOW_MS = 3 * 60 * 60 * 1000;

export function enforceChainVisitWindow(chain: any, now: number): boolean {
    let hasTimedOutMember = false;
    let latestTimeoutAt: number | null = null;

    chain.members = chain.members.map((member: any) => {
        if (!member.isWorking || !member.lastStartedAt) return member;

        const lastVisitAt = member.lastVisitAt || member.lastStartedAt;
        const timeoutAt = lastVisitAt + CHAIN_VISIT_WINDOW_MS;
        if (now <= timeoutAt) return member;

        const contributedUntil = Math.max(member.lastStartedAt, timeoutAt);
        const elapsed = Math.floor((contributedUntil - member.lastStartedAt) / 1000);
        if (elapsed > 0) {
            member.contributionTime += elapsed;
        }

        member.isWorking = false;
        member.lastStartedAt = undefined;
        hasTimedOutMember = true;
        latestTimeoutAt = latestTimeoutAt === null
            ? timeoutAt
            : Math.max(latestTimeoutAt, timeoutAt);
        return member;
    });

    if (hasTimedOutMember) {
        const activeMembers = chain.members.filter((member: any) => member.isWorking).length;
        if (activeMembers === 0 && chain.status === 'Active') {
            const burstAt = latestTimeoutAt ?? now;
            if (chain.lastStartedAt) {
                const chainElapsed = Math.floor((Math.max(chain.lastStartedAt, burstAt) - chain.lastStartedAt) / 1000);
                if (chainElapsed > 0) {
                    chain.totalTime += chainElapsed;
                    if (chain.totalTime > (chain.maxTime || 0)) {
                        chain.maxTime = chain.totalTime;
                    }
                }
            }
            chain.status = 'Burst';
            chain.burstAt = burstAt;
            chain.lastStartedAt = undefined;
        }
    }

    return hasTimedOutMember;
}
