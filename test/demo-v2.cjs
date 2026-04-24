const { GlyphCompressor } = require('../vscode-ext/glyph-middleware.cjs');

const SCENARIOS = [
  {
    name: "Fix TypeScript error in React component",
    context: `Fix the error in UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../types/User';
import { fetchUser } from '../api/users';
import { Avatar } from './Avatar';
import { Badge } from './Badge';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // load user effect
    const loadUser = async () => {
      try {
        const data = await fetchUser(userId);
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [userId]);

  if (loading) return <div className="skeleton" />;
  if (error) return <div className="error">{error}</div>;
  if (!user) return null;

  return (
    <div className="profile-card">
      <Avatar src={user.avatar} size="lg" />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <Badge type={user.role} />
      <p>{user.department.name}</p>
    </div>
  );
};
ERROR: Property 'department' does not exist on type 'User'
I need to add a department field to the User type`
  },
  {
    name: "Optimize slow API endpoint",
    context: `Optimize the performance of the orders API endpoint
import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { validateOrderQuery } from '../validators/order.validator';

export class OrdersController {
  constructor(private orderService: OrderService) {}

  async getOrders(req: Request, res: Response) {
    const { page, limit, status, userId } = req.query;
    /* Fetch all orders based on query params */
    const orders = await this.orderService.findAll({ page, limit, status, userId });
    const total = await this.orderService.count({ status, userId });
    console.log("Fetched orders:", orders.length);
    return res.json({ orders, total, page, limit });
  }

  async getOrderById(req: Request, res: Response) {
    const order = await this.orderService.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json(order);
  }
}
The /api/orders endpoint is taking 3 seconds to respond`
  }
];

const gc = new GlyphCompressor({ level: 'ultra' });

console.log('='.repeat(70));
console.log('GlyphCompress v2 — Ultra Level Demo');
console.log('='.repeat(70));
console.log();

for (const s of SCENARIOS) {
  const r = gc.compressText(s.context);
  const origTokens = Math.ceil(s.context.length / 4);
  const compTokens = Math.ceil(r.compressed.length / 4);
  const savedTokens = origTokens - compTokens;
  const ratio = (origTokens / compTokens).toFixed(1);
  const pct = ((1 - compTokens / origTokens) * 100).toFixed(1);

  console.log(`─── ${s.name} ───`);
  console.log(`  Original Tokens:   ~${origTokens}`);
  console.log(`  Compressed Tokens: ~${compTokens}`);
  console.log(`  Ratio:             ${ratio}x (${pct}% saved)`);
  console.log();
  console.log('  COMPRESSED RESULT:');
  console.log('    ' + r.compressed.split('\\n').join('\\n    '));
  console.log();
}

console.log('='.repeat(70));
const sys = gc.getCodebookPrompt();
console.log('INJECTED SYSTEM PROMPT (Includes Dynamic Dict):');
console.log(sys.split('\\n').slice(0, 5).join('\\n') + '...');
