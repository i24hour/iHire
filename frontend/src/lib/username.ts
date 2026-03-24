import User from '@/models/User';

const USERNAME_MIN_LENGTH = 3;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

const sanitizeUsernameBase = (value: string) => {
    const sanitized = value
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');

    if (!sanitized) {
        return 'user';
    }

    if (sanitized.length >= USERNAME_MIN_LENGTH) {
        return sanitized;
    }

    return `${sanitized}${'_'.repeat(USERNAME_MIN_LENGTH - sanitized.length)}`;
};

export const buildDefaultUsernameFromEmail = (email: string) => {
    const localPart = email.split('@')[0] || 'user';
    return sanitizeUsernameBase(localPart);
};

export const buildDefaultUsername = (email: string, preferredName?: string | null) => {
    const normalizedPreferred = preferredName?.trim();
    if (normalizedPreferred) {
        const fromName = sanitizeUsernameBase(normalizedPreferred);
        if (fromName && fromName !== 'user') {
            return fromName;
        }
    }

    return buildDefaultUsernameFromEmail(email);
};

export async function getAvailableUsername(baseUsername: string, excludeEmail?: string) {
    const normalizedBase = normalizeUsername(baseUsername);
    let candidate = normalizedBase;
    let suffix = 1;

    while (true) {
        const existingUser = await User.findOne({
            username: candidate,
            ...(excludeEmail ? { email: { $ne: excludeEmail } } : {}),
        }).lean();

        if (!existingUser) {
            return candidate;
        }

        suffix += 1;
        candidate = `${normalizedBase}_${suffix}`;
    }
}

export async function ensureUserHasDefaultUsername(email: string, preferredName?: string | null) {
    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        const baseUsername = buildDefaultUsername(normalizedEmail, preferredName);
        const availableUsername = await getAvailableUsername(baseUsername, normalizedEmail);
        user = await User.create({
            email: normalizedEmail,
            username: availableUsername,
        });
        return user;
    }

    if (!user.username) {
        const baseUsername = buildDefaultUsername(normalizedEmail, preferredName);
        user.username = await getAvailableUsername(baseUsername, normalizedEmail);
        await user.save();
        return user;
    }

    const normalizedUsername = normalizeUsername(user.username);
    if (user.username !== normalizedUsername) {
        const availableUsername = await getAvailableUsername(normalizedUsername, normalizedEmail);
        user.username = availableUsername;
        await user.save();
    }

    return user;
}
