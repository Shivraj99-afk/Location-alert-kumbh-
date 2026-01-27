import { groups, users } from "../store";
import { NextResponse } from "next/server";

// Helper to generate a short invite code
function generateCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export async function POST(req) {
    try {
        const { action, userId, groupCode, groupName, userName } = await req.json();

        if (action === "create") {
            const newCode = generateCode();
            groups.set(newCode, {
                name: groupName || "Our Family",
                members: new Set([userId])
            });

            // Update user in store if exists
            const u = users.get(userId);
            if (u) {
                u.groupId = newCode;
                u.name = userName || "Leader";
            }

            return NextResponse.json({ success: true, groupCode: newCode, groupName: groupName || "Our Family" });
        }

        if (action === "join") {
            if (!groups.has(groupCode)) {
                return NextResponse.json({ success: false, error: "Invalid Group Code" }, { status: 404 });
            }

            const group = groups.get(groupCode);
            group.members.add(userId);

            // Update user in store if exists
            const u = users.get(userId);
            if (u) {
                u.groupId = groupCode;
                u.name = userName || "Member";
            }

            return NextResponse.json({ success: true, groupName: group.name });
        }

        if (action === "leave") {
            if (groups.has(groupCode)) {
                const group = groups.get(groupCode);
                group.members.delete(userId);
                if (group.members.size === 0) {
                    groups.delete(groupCode);
                }
            }
            const u = users.get(userId);
            if (u) u.groupId = null;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
