'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { useLanguage } from '@/lib/i18n'
import { formatNPR } from '@/lib/currency'
import '@/app/dashboard.css'

interface InventoryItem {
  id: string
  category_id: string
  item_code: string
  name: string
  description?: string
  quantity_on_hand: number
  minimum_quantity: number
  unit_price?: number
  created_at: string
  updated_at: string
}

interface InventoryCategory {
  id: string
  name: string
  description?: string
}

interface InventoryTransaction {
  id: string
  item_id: string
  transaction_type: 'purchase' | 'usage' | 'return' | 'adjustment' | 'damage'
  quantity: number
  transaction_date: string
  notes?: string
  inventory_items?: {
    name: string
    item_code: string
  }
}

export default function InventoryPage() {
  const { user } = useUser()
  const { t } = useLanguage()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('items')
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [formData, setFormData] = useState({
    category_id: '',
    item_code: '',
    name: '',
    description: '',
    quantity_on_hand: '0',
    minimum_quantity: '10',
    unit_price: '',
  })

  const supabase = createClient()

  const fetchCategories = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase.from('inventory_categories').select('*').eq('tenant_id', user.tenant_id)
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchItems = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase.from('inventory_items').select('*').eq('tenant_id', user.tenant_id)
      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Failed to fetch items:', error)
    }
  }

  const fetchTransactions = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, inventory_items(name, item_code)')
        .eq('tenant_id', user.tenant_id)
        .order('transaction_date', { ascending: false })
      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchItems()
    fetchTransactions()
  }, [user])

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        category_id: item.category_id,
        item_code: item.item_code,
        name: item.name,
        description: item.description || '',
        quantity_on_hand: item.quantity_on_hand.toString(),
        minimum_quantity: item.minimum_quantity.toString(),
        unit_price: item.unit_price?.toString() || '',
      })
    } else {
      setEditingItem(null)
      setFormData({ category_id: '', item_code: '', name: '', description: '', quantity_on_hand: '0', minimum_quantity: '10', unit_price: '' })
    }
    setOpenDialog(true)
  }

  const handleSaveItem = async () => {
    if (!user || !formData.name || !formData.item_code) return
    try {
      if (editingItem) {
        const { error } = await supabase.from('inventory_items').update({
          category_id: formData.category_id,
          item_code: formData.item_code,
          name: formData.name,
          description: formData.description || null,
          quantity_on_hand: parseInt(formData.quantity_on_hand),
          minimum_quantity: parseInt(formData.minimum_quantity),
          unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        }).eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('inventory_items').insert([{
          tenant_id: user.tenant_id,
          category_id: formData.category_id,
          item_code: formData.item_code,
          name: formData.name,
          description: formData.description || null,
          quantity_on_hand: parseInt(formData.quantity_on_hand),
          minimum_quantity: parseInt(formData.minimum_quantity),
          unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        }])
        if (error) throw error
      }
      setOpenDialog(false)
      fetchItems()
    } catch (error) {
      console.error('Failed to save item:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)
      if (error) throw error
      fetchItems()
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const lowStockItems = items.filter((item) => item.quantity_on_hand <= item.minimum_quantity)
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">{t('inventory.title')}</h1>
          <p className="dash-page-subtitle">{t('inventory.subtitle')}</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <button className="dash-btn dash-btn-accent" onClick={() => handleOpenDialog()}>
              <Plus size={16} /> {t('inventory.addItem')}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update inventory item' : 'Add a new inventory item'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item Code</Label>
                  <Input value={formData.item_code} onChange={(e) => setFormData({ ...formData, item_code: e.target.value })} placeholder="SKU001" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Item Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Product name" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" value={formData.quantity_on_hand} onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })} />
                </div>
                <div>
                  <Label>Min. Quantity</Label>
                  <Input type="number" value={formData.minimum_quantity} onChange={(e) => setFormData({ ...formData, minimum_quantity: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input type="number" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} placeholder="0.00" />
              </div>
              <button className="dash-btn dash-btn-accent" style={{ width: '100%' }} onClick={handleSaveItem}>
                {editingItem ? 'Update' : 'Create'} Item
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="dash-metrics-row">
        <div className="dash-metric-card">
          <div className="dash-metric-header">
            <span className="dash-metric-label">Total Items</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-info-soft)', color: 'var(--dash-info)' }}>
              <Package size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{items.length}</div>
          <div className="dash-metric-detail">In inventory</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.1s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">Low Stock</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-warning-soft)', color: 'var(--dash-warning)' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{lowStockItems.length}</div>
          <div className="dash-metric-detail">Items below minimum</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.2s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">Categories</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-success-soft)', color: 'var(--dash-success)' }}>
              <Package size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{categories.length}</div>
          <div className="dash-metric-detail">Item categories</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dash-tab-bar">
        <button className={`dash-tab-item ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>Inventory Items</button>
        <button className={`dash-tab-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>Transactions</button>
        <button className={`dash-tab-item ${activeTab === 'low-stock' ? 'active' : ''}`} onClick={() => setActiveTab('low-stock')}>Low Stock Alert</button>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <>
          <div className="dash-search-wrap">
            <Search size={16} className="dash-search-icon" />
            <input className="dash-search-input" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="dash-table-card">
            <div className="dash-table-header">
              <div className="dash-table-title">Inventory Items</div>
              <div className="dash-table-subtitle">{filteredItems.length} item(s)</div>
            </div>
            <div className="dash-table-body">
              {loading ? (
                <div className="dash-loading">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="dash-empty-state">No items found</div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th className="text-right">Quantity</th>
                      <th className="text-right">Min. Level</th>
                      <th className="text-right">Unit Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const isLowStock = item.quantity_on_hand <= item.minimum_quantity
                      return (
                        <tr key={item.id} className={isLowStock ? 'low-stock' : ''}>
                          <td className="font-medium">{item.item_code}</td>
                          <td>{item.name}</td>
                          <td className="text-right">{item.quantity_on_hand}</td>
                          <td className="text-right">{item.minimum_quantity}</td>
                          <td className="text-right">{item.unit_price ? formatNPR(item.unit_price) : '—'}</td>
                          <td>
                            {isLowStock ? (
                              <span className="dash-badge dash-badge-warning">Low Stock</span>
                            ) : (
                              <span className="dash-badge dash-badge-success">In Stock</span>
                            )}
                          </td>
                          <td>
                            <div className="dash-table-actions">
                              <button className="dash-icon-btn" onClick={() => handleOpenDialog(item)}>
                                <Edit2 size={14} />
                              </button>
                              <button className="dash-icon-btn danger" onClick={() => handleDeleteItem(item.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="dash-table-card">
          <div className="dash-table-header">
            <div className="dash-table-title">Recent Transactions</div>
            <div className="dash-table-subtitle">{transactions.length} transaction(s)</div>
          </div>
          <div className="dash-table-body">
            {loading ? (
              <div className="dash-loading">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="dash-empty-state">No transactions found</div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Type</th>
                    <th className="text-right">Quantity</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trans) => (
                    <tr key={trans.id}>
                      <td>{trans.transaction_date}</td>
                      <td>{trans.inventory_items?.name}</td>
                      <td>
                        <span className="dash-badge dash-badge-neutral" style={{ textTransform: 'capitalize' }}>
                          {trans.transaction_type}
                        </span>
                      </td>
                      <td className="text-right">{trans.quantity}</td>
                      <td className="text-muted">{trans.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Low Stock Tab */}
      {activeTab === 'low-stock' && (
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div className="dash-section-title">Low Stock Items</div>
            <div className="dash-section-subtitle">{lowStockItems.length} item(s) below minimum quantity</div>
          </div>
          <div className="dash-section-body">
            {lowStockItems.length === 0 ? (
              <div className="dash-empty-state">No low stock items</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lowStockItems.map((item) => (
                  <div className="dash-low-stock-item" key={item.id}>
                    <div>
                      <div className="dash-low-stock-title">{item.name}</div>
                      <div className="dash-low-stock-detail">
                        {item.item_code} · Current: {item.quantity_on_hand} · Minimum: {item.minimum_quantity}
                      </div>
                    </div>
                    <button className="dash-action-btn">Reorder</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
