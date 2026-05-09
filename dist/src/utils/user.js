import { UserModel } from '../schemas/users.js';
export async function getUserOrNull(userId) {
    try {
        return await UserModel.findOne({ id: userId });
    }
    catch {
        return null;
    }
}
export async function getOrCreateUser(userId) {
    let user = await getUserOrNull(userId);
    if (!user) {
        user = await UserModel.create({ id: userId });
    }
    return user;
}
export async function userExists(userId) {
    const user = await getUserOrNull(userId);
    return !!user;
}
