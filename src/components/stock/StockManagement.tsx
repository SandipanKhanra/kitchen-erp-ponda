import React, { useMemo, useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { useToast } from '../../context/ToastContext';
import { StockCategory, MeasureIndex, IngredientStockItem } from '../../types/stock';
import { calculateWeightedAveragePrice } from '../../core/stockEngine';
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  History,
  Edit3,
  Check,
  X,
  AlertTriangle,
  IndianRupee,
  ChevronDown,
} from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { sanitizeNumericChange } from '../../utils/numberInput';
import { useModalClose } from '../../hooks/useModalClose';

export const StockManagement: React.FC = () => {
  const { stockItems, recordStockPurchase, updateStockPrice, updateStockCount, addNewStockItem, openAuditModal } = useKitchen();
  const { showToast } = useToast();

  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [stockFilterMode, setStockFilterMode] = useState<'all' | 'low_stock' | 'missing_price'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Inline quick edit states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [focusedStockIdMobile, setFocusedStockIdMobile] = useState<string | null>(null);
  const [editStockQty, setEditStockQty] = useState<number>(0);
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<string>(stockItems[0]?.id || '');
  const [purchasedQty, setPurchasedQty] = useState<number>(10);
  const [purchasedUnitPrice, setPurchasedUnitPrice] = useState<number>(0);

  const selectedPurchaseStockItem = stockItems.find((s) => s.id === selectedItemForPurchase);
  const isPurchasePiece = selectedPurchaseStockItem?.measureIndex === 'piece';

  const openPurchaseFor = (item?: IngredientStockItem) => {
    const target = item || stockItems[0];
    if (target) {
      setSelectedItemForPurchase(target.id);
      setPurchasedUnitPrice(target.price > 0 ? target.price : 0);
      setPurchasedQty(target.measureIndex === 'piece' ? 10 : 5);
    }
    setIsPurchaseModalOpen(true);
  };

  const startInlineEdit = (item: IngredientStockItem) => {
    setEditingItemId(item.id);
    setEditStockQty(item.currentStock);
    setEditUnitPrice(item.price);
  };

  const saveInlineEdit = async (item: IngredientStockItem) => {
    try {
      if (editStockQty !== item.currentStock) {
        await updateStockCount(item.id, editStockQty);
      }
      if (editUnitPrice !== item.price) {
        await updateStockPrice(item.id, editUnitPrice);
      }
      setEditingItemId(null);
      showToast(`Updated "${item.name}"!`, 'success');
    } catch {
      showToast('Failed to update stock item.', 'error');
    }
  };

  const kpis = useMemo(() => {
    const totalValue = stockItems.reduce((sum, s) => sum + s.currentStock * s.price, 0);
    const lowStockCount = stockItems.filter(
      (s) => s.currentStock <= (s.reorderLevel ?? 10)
    ).length;
    const missingPriceCount = stockItems.filter((s) => s.price <= 0).length;
    return { totalValue, lowStockCount, missingPriceCount };
  }, [stockItems]);

  const livePurchasePreview = useMemo(() => {
    if (!selectedPurchaseStockItem || purchasedQty <= 0) return null;
    const lineTotal = purchasedQty * purchasedUnitPrice;
    const calc = calculateWeightedAveragePrice(
      selectedPurchaseStockItem.currentStock,
      selectedPurchaseStockItem.price,
      purchasedQty,
      purchasedUnitPrice
    );
    return {
      lineTotal,
      newStock: calc.newStock,
      newAvgPrice: calc.newAdjustedPrice,
    };
  }, [selectedPurchaseStockItem, purchasedQty, purchasedUnitPrice]);

  // New Item modal
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  useModalClose(isPurchaseModalOpen, () => setIsPurchaseModalOpen(false));
  useModalClose(isNewItemModalOpen, () => setIsNewItemModalOpen(false));
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState<StockCategory>('Grocery');
  const [newMeasureIndex, setNewMeasureIndex] = useState<MeasureIndex>('kg');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);

  const categories: StockCategory[] = ['Grocery', 'Vegetables', 'Fruits', 'Dairy'];

  const filtered = stockItems.filter((s) => {
    const matchCat = selectedCat === 'All' || s.category === selectedCat;
    const matchMode =
      stockFilterMode === 'all' ||
      (stockFilterMode === 'low_stock' && s.currentStock <= (s.reorderLevel ?? 10)) ||
      (stockFilterMode === 'missing_price' && s.price <= 0);
    const matchSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchMode && matchSearch;
  });

  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCatChange = (cat: string) => {
    setSelectedCat(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleRecordPurchase = async () => {
    if (!selectedItemForPurchase || purchasedQty <= 0 || purchasedUnitPrice <= 0) {
      showToast('Please select item, quantity, and unit purchase price.', 'warning');
      return;
    }

    await recordStockPurchase({
      ingredientId: selectedItemForPurchase,
      purchasedQty,
      purchasedUnitPrice,
    });

    showToast('Stock purchase recorded & weighted average price updated!', 'success');
    setIsPurchaseModalOpen(false);
  };

  const handleAddNewItem = async () => {
    if (!newName.trim()) {
      showToast('Please enter an Item Name.', 'warning');
      return;
    }
    try {
      await addNewStockItem({
        name: newName.trim(),
        brand: newBrand.trim(),
        category: newCategory,
        measureIndex: newMeasureIndex,
        price: newPrice,
        currentStock: newStock,
        reorderLevel: 10,
      });
      showToast(`Stock item "${newName.trim()}" added!`, 'success');
      setIsNewItemModalOpen(false);
      setNewName('');
      setNewBrand('');
      setNewPrice(0);
      setNewStock(0);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save stock item. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Stock & Weighted Average Price Adjuster
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Categories: <strong>Grocery, Vegetables, Fruits, Dairy</strong>. Automatically adjusts moving average prices when stock is replenished.
          </p>
        </div>

        <div className="toolbar-btn-row">
          <button
            onClick={() => openAuditModal('stock')}
            className="modern-btn-secondary"
            title="View purchase & stock adjustment history"
          >
            <History className="w-3.5 h-3.5 text-emerald-500" />
            <span>Stock Audit Trail</span>
          </button>
          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="modern-btn-secondary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stock Item</span>
          </button>
          <button
            onClick={() => openPurchaseFor()}
            className="h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-600/80 shadow-sm hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Receive Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="modern-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Inventory Value</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              ₹{kpis.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {stockItems.length} tracked ingredients
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStockFilterMode(stockFilterMode === 'low_stock' ? 'all' : 'low_stock');
            setCurrentPage(1);
          }}
          className={`text-left p-4 rounded-2xl border transition flex items-center justify-between ${
            stockFilterMode === 'low_stock'
              ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/30'
              : 'modern-card hover:border-amber-300'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Low / Out of Stock</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {kpis.lowStockCount} Items
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {stockFilterMode === 'low_stock' ? 'Click to show all' : 'Click to filter low stock'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStockFilterMode(stockFilterMode === 'missing_price' ? 'all' : 'missing_price');
            setCurrentPage(1);
          }}
          className={`text-left p-4 rounded-2xl border transition flex items-center justify-between ${
            stockFilterMode === 'missing_price'
              ? 'bg-purple-50/90 dark:bg-purple-950/50 border-purple-400 ring-2 ring-purple-400/30'
              : 'modern-card hover:border-purple-300'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Missing Unit Price (₹0)</span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {kpis.missingPriceCount} Items
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {stockFilterMode === 'missing_price' ? 'Click to show all' : 'Click to set rates'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Package className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Category Filter Tabs */}
        <div className="toolbar-pill-group text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => handleCatChange('All')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedCat === 'All'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({stockItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCatChange(cat)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedCat === cat
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search stock by name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      {/* Stock List (Mobile Cards + Desktop Table) */}
      <div className="modern-card rounded-3xl overflow-hidden">
        {/* Mobile Stacked Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-400">
              No items found matching your filters.
            </div>
          ) : (
            paginatedItems.map((item, idx) => {
              const isEditing = editingItemId === item.id;
              const isOut = item.currentStock <= 0;
              const isLow = !isOut && item.currentStock <= (item.reorderLevel ?? 10);
              const isMobileExpanded =
                isEditing ||
                focusedStockIdMobile === item.id ||
                (focusedStockIdMobile === null && idx === 0);

              return (
                <div
                  key={item.id}
                  onClick={() => setFocusedStockIdMobile(item.id)}
                  className="p-4 space-y-3 text-xs cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.brand || 'Generic'} &bull; {item.category}
                        {!isMobileExpanded && (
                          <span> &bull; {item.currentStock} {item.measureIndex} &bull; ₹{item.price.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {isOut && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Out of Stock
                          </span>
                        )}
                        {isLow && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Low Stock
                          </span>
                        )}
                        {item.price <= 0 && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            No Price
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isMobileExpanded ? 'rotate-180 text-orange-500' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {isMobileExpanded && (
                  <div onClick={(e) => e.stopPropagation()} className="space-y-3">

                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Stock ({item.measureIndex})</label>
                        <input
                          type="number"
                          min="0"
                          step={item.measureIndex === 'piece' ? '1' : 'any'}
                          value={editStockQty}
                          onChange={(e) => setEditStockQty(Number(e.target.value) || 0)}
                          className="w-full mt-0.5 p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Unit Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={editUnitPrice}
                          onChange={(e) => setEditUnitPrice(Number(e.target.value) || 0)}
                          className="w-full mt-0.5 p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-xs font-bold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2 rounded-xl border-l-2 border-l-slate-400">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Stock</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.currentStock} {item.measureIndex}
                        </span>
                      </div>
                      <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2 rounded-xl border-l-2 border-l-orange-500">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Unit Rate</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          ₹{item.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2 rounded-xl border-l-2 border-l-emerald-500">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Value</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{(item.currentStock * item.price).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveInlineEdit(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-500 text-white font-bold"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startInlineEdit(item)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPurchaseFor(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Purchase</span>
                        </button>
                      </>
                    )}
                  </div>
                  </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto pb-1">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50/90 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-4">Item Name</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Current Stock</th>
                <th className="px-5 py-4">Adjusted Unit Price</th>
                <th className="px-5 py-4">Total Asset Value</th>
                <th className="px-5 py-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No items found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isEditing = editingItemId === item.id;
                  const isOut = item.currentStock <= 0;
                  const isLow = !isOut && item.currentStock <= (item.reorderLevel ?? 10);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                          {isOut && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              Out of Stock
                            </span>
                          )}
                          {isLow && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Low
                            </span>
                          )}
                          {item.price <= 0 && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              No Price
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.brand || 'Generic'}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step={item.measureIndex === 'piece' ? '1' : 'any'}
                              value={editStockQty}
                              onChange={(e) => setEditStockQty(Number(e.target.value) || 0)}
                              className="w-20 p-1.5 rounded-lg border border-orange-400 dark:bg-slate-900 text-xs font-bold"
                            />
                            <span className="text-slate-400 text-[11px]">{item.measureIndex}</span>
                          </div>
                        ) : (
                          <span>
                            {item.currentStock} {item.measureIndex}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-orange-600 dark:text-orange-400">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span>₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={editUnitPrice}
                              onChange={(e) => setEditUnitPrice(Number(e.target.value) || 0)}
                              className="w-20 p-1.5 rounded-lg border border-orange-400 dark:bg-slate-900 text-xs font-bold"
                            />
                          </div>
                        ) : (
                          <span>
                            ₹{item.price.toFixed(2)} / {item.measureIndex}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{(item.currentStock * item.price).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveInlineEdit(item)}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                title="Save changes"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startInlineEdit(item)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold inline-flex items-center gap-1"
                                title="Quick adjust stock count or price"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Adjust</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openPurchaseFor(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-bold inline-flex items-center gap-1"
                                title="Receive purchase for this item"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Purchase</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        pageSizeOptions={[6, 8, 16, 24]}
      />

      {/* Modal: Receive Stock Purchase (Adjust Weighted Average Price) */}
      {isPurchaseModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPurchaseModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Receive Purchase & Auto-Adjust Price
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When new stock arrives, enter the purchase quantity and bill rate. The system automatically recalculates the <strong>weighted average price</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Ingredient</label>
                  <select
                    value={selectedItemForPurchase}
                    onChange={(e) => setSelectedItemForPurchase(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white text-xs"
                  >
                    {stockItems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Current Stock: {s.currentStock} {s.measureIndex} @ ₹{s.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">New Qty Purchased</label>
                    <input
                      type="number"
                      min="0"
                      step={isPurchasePiece ? '1' : selectedPurchaseStockItem?.measureIndex === 'kg' ? '0.25' : selectedPurchaseStockItem?.measureIndex === 'litre' ? '0.5' : 'any'}
                      placeholder="0"
                      value={purchasedQty === 0 ? '' : purchasedQty}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const { numValue } = sanitizeNumericChange(e, !isPurchasePiece);
                        setPurchasedQty(isPurchasePiece ? Math.round(numValue) : numValue);
                      }}
                      className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">New Purchase Unit Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={purchasedUnitPrice === 0 ? '' : purchasedUnitPrice}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const { numValue } = sanitizeNumericChange(e, true);
                        setPurchasedUnitPrice(numValue);
                      }}
                      className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Live Purchase & Weighted Average Price Preview */}
                {livePurchasePreview && selectedPurchaseStockItem && (
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Purchase Total:</span>
                      <strong className="text-slate-900 dark:text-white">
                        ₹{livePurchasePreview.lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>New Stock Balance:</span>
                      <strong className="text-emerald-700 dark:text-emerald-300">
                        {livePurchasePreview.newStock} {selectedPurchaseStockItem.measureIndex}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300 pt-1 border-t border-emerald-200/70 dark:border-emerald-800/70">
                      <span>New Weighted Avg Price:</span>
                      <strong className="text-orange-600 dark:text-orange-400">
                        ₹{livePurchasePreview.newAvgPrice.toFixed(2)} / {selectedPurchaseStockItem.measureIndex}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-3">
                  <button
                    onClick={() => setIsPurchaseModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordPurchase}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                  >
                    Apply & Recalculate Price
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Stock Item */}
      {isNewItemModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsNewItemModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Add New Stock Item</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sabudana (Tapioca Pearls)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Brand</label>
                <input
                  type="text"
                  placeholder="e.g. Rajdhani"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as StockCategory)}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Measure Index</label>
                  <select
                    value={newMeasureIndex}
                    onChange={(e) => {
                      const val = e.target.value as MeasureIndex;
                      setNewMeasureIndex(val);
                      if (val === 'piece' && newStock) {
                        setNewStock(Math.round(newStock));
                      }
                    }}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  >
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                    <option value="piece">piece</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Unit Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={newPrice === 0 ? '' : newPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const { numValue } = sanitizeNumericChange(e, true);
                      setNewPrice(numValue);
                    }}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    step={newMeasureIndex === 'piece' ? '1' : newMeasureIndex === 'kg' ? '0.25' : newMeasureIndex === 'litre' ? '0.5' : 'any'}
                    placeholder="0"
                    value={newStock === 0 ? '' : newStock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const isPiece = newMeasureIndex === 'piece';
                      const { numValue } = sanitizeNumericChange(e, !isPiece);
                      setNewStock(isPiece ? Math.round(numValue) : numValue);
                    }}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3">
                <button
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNewItem}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition"
                >
                  Save Stock Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
