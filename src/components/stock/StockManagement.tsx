import React, { useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { StockCategory, MeasureIndex } from '../../types/stock';
import { Package, Plus, DollarSign, RefreshCw, CheckCircle2, TrendingUp, Search, History } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { sanitizeNumericChange } from '../../utils/numberInput';

export const StockManagement: React.FC = () => {
  const { stockItems, recordStockPurchase, updateStockPrice, updateStockCount, addNewStockItem, openAuditModal } = useKitchen();

  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<string>(stockItems[0]?.id || '');
  const [purchasedQty, setPurchasedQty] = useState<number>(10);
  const [purchasedUnitPrice, setPurchasedUnitPrice] = useState<number>(0);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const selectedPurchaseStockItem = stockItems.find((s) => s.id === selectedItemForPurchase);
  const isPurchasePiece = selectedPurchaseStockItem?.measureIndex === 'piece';

  // New Item modal
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState<StockCategory>('Grocery');
  const [newMeasureIndex, setNewMeasureIndex] = useState<MeasureIndex>('kg');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);

  const categories: StockCategory[] = ['Grocery', 'Vegetables', 'Fruits', 'Dairy'];

  const filtered = stockItems.filter((s) => {
    const matchCat = selectedCat === 'All' || s.category === selectedCat;
    const matchSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
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
      alert('Please select item, quantity, and unit purchase price.');
      return;
    }

    await recordStockPurchase({
      ingredientId: selectedItemForPurchase,
      purchasedQty,
      purchasedUnitPrice,
    });

    setPurchaseSuccess(true);
    setTimeout(() => {
      setPurchaseSuccess(false);
      setIsPurchaseModalOpen(false);
    }, 2000);
  };

  const handleAddNewItem = async () => {
    if (!newName) return;
    await addNewStockItem({
      name: newName,
      brand: newBrand,
      category: newCategory,
      measureIndex: newMeasureIndex,
      price: newPrice,
      currentStock: newStock,
      reorderLevel: 10,
    });
    setIsNewItemModalOpen(false);
    setNewName('');
    setNewBrand('');
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

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => openAuditModal('stock')}
            className="flex items-center space-x-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
            title="View purchase & stock adjustment history"
          >
            <History className="w-3.5 h-3.5 text-emerald-500" />
            <span>Stock Audit Trail</span>
          </button>
          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="flex items-center space-x-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stock Item</span>
          </button>
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Receive Purchase (Adjust Price)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold w-full sm:w-auto">
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

      {/* Stock Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto pb-1">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Brand</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Measure Index</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4">Adjusted Unit Price</th>
                <th className="px-6 py-4">Total Asset Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    No items found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400 font-medium">{item.brand}</td>
                    <td className="px-6 py-3.5">
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500 dark:text-slate-400">{item.measureIndex}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {item.currentStock} {item.measureIndex}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-orange-600 dark:text-orange-400">
                      ₹{item.price.toFixed(2)} / {item.measureIndex}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{(item.currentStock * item.price).toFixed(2)}
                    </td>
                  </tr>
                ))
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Receive Purchase & Auto-Adjust Price
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When new stock arrives, enter the purchase quantity and bill rate. The system automatically recalculates the <strong>weighted average price</strong>.
            </p>

            {purchaseSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-center font-bold text-xs">
                Stock updated & weighted price adjusted successfully!
              </div>
            ) : (
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
                      step={isPurchasePiece ? '1' : 'any'}
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
            )}
          </div>
        </div>
      )}

      {/* Modal: Add New Stock Item */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
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
                    step={newMeasureIndex === 'piece' ? '1' : 'any'}
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
