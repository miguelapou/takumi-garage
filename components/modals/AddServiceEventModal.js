import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Package, ChevronDown, Check, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Heading1, Heading2, Minus, Link } from 'lucide-react';
import { useUI } from '../../contexts';
import { getVendorDisplayColor } from '../../utils/colorUtils';
import { toSentenceCase } from '../../utils/styleUtils';

const ToolbarButton = ({ onClick, title, active, darkMode, children }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    className={`w-7 h-7 flex items-center justify-center rounded transition-colors text-sm font-medium ${
      active
        ? darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-300 text-gray-900'
        : darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
    }`}
  >
    {children}
  </button>
);

const ToolbarDivider = ({ darkMode }) => (
  <div className={`w-px h-4 mx-0.5 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
);

/**
 * Modal for adding/editing a service event for a vehicle
 * Manages its own closing animation state internally
 */
const AddServiceEventModal = ({
  isOpen,
  onClose,
  darkMode,
  // Form state
  eventDate,
  setEventDate,
  description,
  setDescription,
  odometer,
  setOdometer,
  notes,
  setNotes,
  linkedPartIds,
  setLinkedPartIds,
  cost,
  setCost,
  // Parts data
  parts = [],
  vendorColors = {},
  // Edit mode
  editingEvent,
  // Handlers
  onSave,
  onDelete,
  saving
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [showPartsDropdown, setShowPartsDropdown] = useState(false);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const partsDropdownRef = useRef(null);
  const { toast } = useUI();

  // Rich text editor state
  const notesEditorRef = useRef(null);
  const linkInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Sync notes editor content when modal opens
  useEffect(() => {
    if (isOpen && notesEditorRef.current) {
      notesEditorRef.current.innerHTML = notes || '';
    }
  }, [isOpen]);

  // Focus link input when it appears
  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    });
  };

  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    notesEditorRef.current?.focus();
    updateActiveFormats();
  };

  const handleHeading = (tag) => {
    document.execCommand('formatBlock', false, tag);
    notesEditorRef.current?.focus();
  };

  const handleHorizontalRule = () => {
    document.execCommand('insertHorizontalRule', false, null);
    notesEditorRef.current?.focus();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const handleLinkButtonClick = () => {
    saveSelection();
    const sel = window.getSelection();
    const anchor = sel?.anchorNode?.parentElement?.closest('a');
    if (anchor) {
      restoreSelection();
      document.execCommand('unlink', false, null);
      notesEditorRef.current?.focus();
      updateActiveFormats();
      return;
    }
    setLinkUrl('');
    setShowLinkInput(true);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) { setShowLinkInput(false); return; }
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    restoreSelection();
    document.execCommand('createLink', false, url);
    const sel = window.getSelection();
    const anchor = sel?.anchorNode?.parentElement?.closest('a');
    if (anchor) { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
    notesEditorRef.current?.focus();
    updateActiveFormats();
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const handleLinkKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleInsertLink(); }
    else if (e.key === 'Escape') { setShowLinkInput(false); notesEditorRef.current?.focus(); }
  };

  const handleEditorKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); execCmd('bold'); break;
        case 'i': e.preventDefault(); execCmd('italic'); break;
        case 'u': e.preventDefault(); execCmd('underline'); break;
      }
    }
  };

  // Handle dropdown close with animation
  const closeDropdown = () => {
    setIsDropdownClosing(true);
    setTimeout(() => {
      setShowPartsDropdown(false);
      setIsDropdownClosing(false);
    }, 150);
  };

  const toggleDropdown = () => {
    if (showPartsDropdown) {
      closeDropdown();
    } else {
      setShowPartsDropdown(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (partsDropdownRef.current && !partsDropdownRef.current.contains(event.target)) {
        if (showPartsDropdown && !isDropdownClosing) {
          closeDropdown();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPartsDropdown, isDropdownClosing]);

  // Ensure linkedPartIds is always an array
  const safeLinkedPartIds = linkedPartIds || [];

  // Filter parts based on search term, excluding archived parts
  const filteredParts = parts.filter(part =>
    !part.archived && (
      part.part.toLowerCase().includes(partsSearchTerm.toLowerCase()) ||
      (part.vendor && part.vendor.toLowerCase().includes(partsSearchTerm.toLowerCase()))
    )
  );

  // Toggle part selection
  const togglePartSelection = (partId) => {
    if (!setLinkedPartIds) return;
    if (safeLinkedPartIds.includes(partId)) {
      setLinkedPartIds(safeLinkedPartIds.filter(id => id !== partId));
    } else {
      setLinkedPartIds([...safeLinkedPartIds, partId]);
    }
  };

  // Get selected parts data
  const selectedParts = parts.filter(part => safeLinkedPartIds.includes(part.id));

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  };

  const handleSave = async () => {
    if (!eventDate) {
      toast?.warning('Please select a date');
      return;
    }
    if (!description.trim()) {
      toast?.warning('Please enter a description');
      return;
    }
    const result = await onSave();
    if (result) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const isEditMode = !!editingEvent;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] modal-backdrop ${
        isClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
      }`}
      onClick={handleClose}
    >
      <div
        className={`rounded-lg shadow-xl max-w-md w-full mx-4 modal-content ${
          isClosing ? 'modal-popup-exit' : 'modal-popup-enter'
        } ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          darkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-300 bg-slate-50'
        }`}>
          <h3 className={`text-lg font-semibold ${
            darkMode ? 'text-gray-100' : 'text-gray-800'
          }`} style={{ fontFamily: "'FoundationOne', 'Courier New', monospace" }}>
            {isEditMode ? 'Edit Service Event' : 'Add Service Event'}
          </h3>
          <button
            onClick={handleClose}
            className={`p-1 rounded transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Date field */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
            />
          </div>

          {/* Description field */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={(e) => setDescription(toSentenceCase(e.target.value))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
              }`}
              placeholder="e.g., Oil change, Brake pads replaced"
            />
          </div>

          {/* Odometer + Cost fields */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Odometer
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                }`}
                placeholder="e.g., 125000"
              />
            </div>
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Cost
              </label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  $
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                  }`}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Notes field */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Notes
            </label>
            <div className={`border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              {/* Toolbar */}
              <div className={`flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b ${
                darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-slate-50'
              }`}>
                <ToolbarButton onClick={() => execCmd('bold')} title="Bold (Ctrl+B)" active={activeFormats.bold} darkMode={darkMode}>
                  <Bold className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => execCmd('italic')} title="Italic (Ctrl+I)" active={activeFormats.italic} darkMode={darkMode}>
                  <Italic className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => execCmd('underline')} title="Underline (Ctrl+U)" active={activeFormats.underline} darkMode={darkMode}>
                  <Underline className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => execCmd('strikeThrough')} title="Strikethrough" active={activeFormats.strikeThrough} darkMode={darkMode}>
                  <Strikethrough className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarDivider darkMode={darkMode} />
                <ToolbarButton onClick={() => handleHeading('h1')} title="Heading 1" darkMode={darkMode}>
                  <Heading1 className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => handleHeading('h2')} title="Heading 2" darkMode={darkMode}>
                  <Heading2 className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarDivider darkMode={darkMode} />
                <ToolbarButton onClick={() => execCmd('insertUnorderedList')} title="Bullet List" active={activeFormats.insertUnorderedList} darkMode={darkMode}>
                  <List className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => execCmd('insertOrderedList')} title="Numbered List" active={activeFormats.insertOrderedList} darkMode={darkMode}>
                  <ListOrdered className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarDivider darkMode={darkMode} />
                <ToolbarButton onClick={handleLinkButtonClick} title="Insert / Remove Link" active={showLinkInput} darkMode={darkMode}>
                  <Link className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarDivider darkMode={darkMode} />
                <ToolbarButton onClick={handleHorizontalRule} title="Horizontal Rule" darkMode={darkMode}>
                  <Minus className="w-3.5 h-3.5" />
                </ToolbarButton>
              </div>

              {/* Link input bar */}
              {showLinkInput && (
                <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${
                  darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-blue-50'
                }`}>
                  <Link className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-blue-500'}`} />
                  <input
                    ref={linkInputRef}
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={handleLinkKeyDown}
                    placeholder="https://example.com"
                    className={`flex-1 text-sm px-2 py-1 rounded border outline-none focus:ring-1 focus:ring-blue-500 ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                        : 'bg-white border-slate-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleInsertLink(); }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    Insert
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(false); notesEditorRef.current?.focus(); }}
                    className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Editor */}
              <div
                ref={notesEditorRef}
                contentEditable
                suppressContentEditableWarning
                onKeyDown={handleEditorKeyDown}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                onSelect={updateActiveFormats}
                onInput={() => setNotes(notesEditorRef.current?.innerHTML || '')}
                className={`px-4 py-2 outline-none notes-editor ${
                  darkMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-800'
                }`}
                style={{ minHeight: '140px' }}
                data-placeholder="Additional details, parts used, costs, etc."
              />
            </div>
          </div>

          {/* Linked Parts field */}
          <div ref={partsDropdownRef} className="relative">
            <div className={`flex items-center justify-between mb-2`}>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>Linked Parts</span>
                </div>
              </label>
              {selectedParts.length > 0 && (
                <span className={`text-sm font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  ${selectedParts.reduce((sum, p) => sum + (p.total || 0), 0).toFixed(2)}
                </span>
              )}
            </div>

            {/* Selected parts pills */}
            {selectedParts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedParts.map(part => {
                  const vendorColor = part.vendor && vendorColors[part.vendor];
                  const colors = vendorColor ? getVendorDisplayColor(vendorColor, darkMode) : null;
                  return (
                    <span
                      key={part.id}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                        darkMode ? 'bg-green-900/40 border-green-700' : 'bg-green-50 border-green-300'
                      }`}
                    >
                      <span className={darkMode ? 'text-green-200' : 'text-green-800'}>{part.part}</span>
                      <span className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        ${part.total?.toFixed(2) || '0.00'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePartSelection(part.id)}
                        className={`ml-1 hover:text-red-500 ${
                          darkMode ? 'text-green-600' : 'text-green-500'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Dropdown trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleDropdown}
                className={`w-full px-4 py-2 border rounded-lg flex items-center justify-between transition-colors ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <span>{selectedParts.length === 0 ? 'Select parts...' : `${selectedParts.length} part${selectedParts.length !== 1 ? 's' : ''} selected`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showPartsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu - opens upward since this field is at the bottom */}
              {showPartsDropdown && (
                <div
                  className={`absolute z-50 bottom-full mb-1 w-full max-h-64 overflow-y-auto rounded-lg border shadow-lg transition-all duration-150 ${
                    isDropdownClosing
                      ? 'opacity-0 translate-y-2'
                      : 'opacity-100 translate-y-0'
                  } ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  style={{ animation: isDropdownClosing ? 'none' : 'slideUp 150ms ease-out' }}
                >
                  {/* Search input */}
                  <div className={`sticky top-0 p-2 border-b ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                  }`}>
                    <div className="relative">
                      <input
                        type="text"
                        value={partsSearchTerm}
                        onChange={(e) => setPartsSearchTerm(e.target.value)}
                        placeholder="Search parts..."
                        className={`w-full px-3 py-1.5 pr-8 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          darkMode
                            ? 'bg-gray-600 border-gray-500 text-gray-100 placeholder-gray-400'
                            : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400'
                        }`}
                      />
                      {partsSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setPartsSearchTerm('')}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors ${
                            darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-500' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                {/* Parts list */}
                {filteredParts.length === 0 ? (
                  <div className={`p-3 text-sm text-center ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    No parts found
                  </div>
                ) : (
                  filteredParts.map(part => {
                    const vendorColor = part.vendor && vendorColors[part.vendor];
                    const colors = vendorColor ? getVendorDisplayColor(vendorColor, darkMode) : null;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => togglePartSelection(part.id)}
                        className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
                          safeLinkedPartIds.includes(part.id)
                            ? darkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                            : darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          safeLinkedPartIds.includes(part.id)
                            ? 'bg-blue-500 border-blue-500'
                            : darkMode ? 'border-gray-500' : 'border-gray-300'
                        }`}>
                          {safeLinkedPartIds.includes(part.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium truncate block ${
                            darkMode ? 'text-gray-200' : 'text-gray-800'
                          }`}>
                            {part.part}
                          </span>
                          {part.vendor && (
                            <span
                              className="text-xs"
                              style={colors ? { color: colors.text } : { color: darkMode ? '#9CA3AF' : '#6B7280' }}
                            >
                              {part.vendor}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-medium ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          ${part.total?.toFixed(2) || '0.00'}
                        </span>
                      </button>
                    );
                  })
                )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-between gap-3 ${
          darkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-300 bg-slate-50'
        }`}>
          {/* Delete button - mobile only, edit mode only */}
          {isEditMode && onDelete ? (
            <button
              onClick={() => {
                onDelete();
                handleClose();
              }}
              className={`md:hidden px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-red-900/50 hover:bg-red-900 text-red-400'
                  : 'bg-red-100 hover:bg-red-200 text-red-600'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !eventDate || !description.trim()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                saving || !eventDate || !description.trim()
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Add')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddServiceEventModal;
