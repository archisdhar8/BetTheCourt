export class InMemoryNotificationsRepository {
    rows = [];
    async insert(notification) {
        this.rows.push({ ...notification });
    }
    async listForUser(userId) {
        const list = this.rows.filter((n) => n.userId === userId);
        return [...list].sort((a, b) => {
            const t = b.createdAt.localeCompare(a.createdAt);
            if (t !== 0)
                return t;
            return b.id.localeCompare(a.id);
        });
    }
    async findForUser(userId, notificationId) {
        return this.rows.find((n) => n.userId === userId && n.id === notificationId) ?? null;
    }
    async updateReadAt(userId, notificationId, readAt) {
        const n = this.rows.find((r) => r.userId === userId && r.id === notificationId);
        if (!n)
            return;
        n.readAt = readAt;
    }
    async markAllReadForUser(userId, readAt) {
        let n = 0;
        for (const row of this.rows) {
            if (row.userId === userId && row.readAt === null) {
                row.readAt = readAt;
                n++;
            }
        }
        return n;
    }
    clear() {
        this.rows.length = 0;
    }
}
//# sourceMappingURL=repository.js.map