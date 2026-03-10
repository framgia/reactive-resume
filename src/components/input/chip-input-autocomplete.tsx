import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleIcon, XIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useControlledState } from "@/hooks/use-controlled-state";
import { cn } from "@/utils/style";
import { Kbd } from "../ui/kbd";

const RETURN_KEY = "Enter";
const COMMA_KEY = ",";

type ChipItemProps = {
	id: string;
	chip: string;
	index: number;
	isEditing: boolean;
	onEdit: (index: number) => void;
	onRemove: (index: number) => void;
};

function ChipItem({ id, chip, index, isEditing, onEdit, onRemove }: ChipItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

	const [isHovered, setIsHovered] = React.useState(false);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 10 : undefined,
		opacity: isDragging ? 0.6 : 1,
	};

	return (
		<div
			style={style}
			ref={setNodeRef}
			className="relative touch-none"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			{...attributes}
			{...listeners}
		>
			<Badge
				variant="outline"
				className={cn(
					"flex h-7 cursor-grab select-none items-center gap-0 overflow-hidden px-3 active:cursor-grabbing",
					isEditing && "border-primary ring-1 ring-primary",
					isDragging && "opacity-80",
				)}
			>
				<span className="max-w-32 truncate">{chip}</span>
				<motion.div
					initial={false}
					animate={{ width: isHovered ? 40 : 0, marginInlineStart: isHovered ? 8 : 0, opacity: isHovered ? 1 : 0 }}
					transition={{ duration: 0.15, ease: "linear" }}
					className="flex shrink-0 items-center gap-x-1 overflow-hidden"
				>
					<button
						type="button"
						tabIndex={-1}
						aria-label={`Edit ${chip}`}
						onClick={(e) => {
							e.stopPropagation();
							onEdit(index);
						}}
						className="rounded-sm p-0.5 hover:bg-secondary hover:text-foreground focus:outline-none"
					>
						<PencilSimpleIcon className="size-3.5" />
					</button>
					<button
						type="button"
						tabIndex={-1}
						aria-label={`Remove ${chip}`}
						onClick={(e) => {
							e.stopPropagation();
							onRemove(index);
						}}
						className="rounded-sm p-0.5 hover:bg-destructive/10 hover:text-destructive focus:outline-none"
					>
						<XIcon className="size-3.5" />
					</button>
				</motion.div>
			</Badge>
		</div>
	);
}

export type ChipInputAutocompleteProps = Omit<React.ComponentProps<"div">, "value" | "onChange"> & {
	value?: string[];
	defaultValue?: string[];
	onChange?: (value: string[]) => void;
	/** List of suggestions for autocomplete. Dropdown is shown as the user types. */
	suggestions: string[];
	/** Called when the user types in the input (e.g. for fetching suggestions). Only when not editing an existing chip. */
	onInputChange: (value: string) => void;
};

export function ChipInputAutocomplete({
	value,
	defaultValue = [],
	onChange,
	suggestions,
	onInputChange,
	className,
	...props
}: ChipInputAutocompleteProps) {
	const [chips, setChips] = useControlledState<string[]>({
		value,
		defaultValue,
		onChange,
	});

	const [input, setInput] = React.useState("");
	const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
	const [suggestionOpen, setSuggestionOpen] = React.useState(false);
	const [highlightedIndex, setHighlightedIndex] = React.useState(0);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const listRef = React.useRef<HTMLDivElement>(null);

	const filteredSuggestions = React.useMemo(() => {
		if (!suggestions.length) return [];
		const lower = input.trim().toLowerCase();
		const filtered = suggestions.filter((s) => !chips.includes(s) && (lower === "" || s.toLowerCase().includes(lower)));
		return filtered.slice(0, 10);
	}, [suggestions, input, chips]);

	// Show dropdown when focused and either we have matches or the user is typing (so they see results or "no matches")
	const hasInput = input.trim().length > 0;
	const showSuggestions = suggestionOpen && (filteredSuggestions.length > 0 || hasInput);

	const addChip = React.useCallback(
		(chip: string) => {
			const trimmed = chip.trim();
			if (!trimmed) return;
			const newChips = Array.from(new Set([...chips, trimmed]));
			setChips(newChips);
		},
		[chips, setChips],
	);

	const updateChip = React.useCallback(
		(index: number, newValue: string) => {
			const trimmed = newValue.trim();
			if (!trimmed || index < 0 || index >= chips.length) return;

			const existingIndex = chips.findIndex((c, i) => c === trimmed && i !== index);
			if (existingIndex !== -1) return;

			const newChips = [...chips];
			newChips[index] = trimmed;
			setChips(newChips);
		},
		[chips, setChips],
	);

	const removeChip = React.useCallback(
		(index: number) => {
			if (index < 0 || index >= chips.length) return;
			const newChips = chips.slice(0, index).concat(chips.slice(index + 1));
			setChips(newChips);

			if (editingIndex === index) {
				setEditingIndex(null);
				setInput("");
			} else if (editingIndex !== null && editingIndex > index) {
				setEditingIndex(editingIndex - 1);
			}
		},
		[chips, setChips, editingIndex],
	);

	const handleEdit = React.useCallback(
		(index: number) => {
			setEditingIndex(index);
			setInput(chips[index]);
			inputRef.current?.focus();
		},
		[chips],
	);

	const handleReorder = React.useCallback(
		(newOrder: string[]) => {
			if (editingIndex !== null) {
				const editingChip = chips[editingIndex];
				const newIndex = newOrder.indexOf(editingChip);
				if (newIndex !== -1 && newIndex !== editingIndex) {
					setEditingIndex(newIndex);
				}
			}
			setChips(newOrder);
		},
		[chips, editingIndex, setChips],
	);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 3 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = React.useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;
			const oldIndex = chips.indexOf(active.id as string);
			const newIndex = chips.indexOf(over.id as string);
			if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
				const newOrder = Array.from(chips);
				const [removed] = newOrder.splice(oldIndex, 1);
				newOrder.splice(newIndex, 0, removed);
				handleReorder(newOrder);
			}
		},
		[chips, handleReorder],
	);

	React.useEffect(() => {
		setHighlightedIndex(0);
	}, [filteredSuggestions]);

	const handleInputChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value;
			if (editingIndex === null) onInputChange(newValue);

			if (editingIndex !== null) {
				if (newValue.includes(",")) {
					updateChip(editingIndex, newValue.replace(",", ""));
					setEditingIndex(null);
					setInput("");
				} else {
					setInput(newValue);
				}
				return;
			}

			if (newValue.includes(",")) {
				const parts = newValue.split(",");
				parts.slice(0, -1).forEach(addChip);
				setInput(parts[parts.length - 1]);
			} else {
				setInput(newValue);
			}
		},
		[addChip, editingIndex, onInputChange, updateChip],
	);

	const selectSuggestion = React.useCallback(
		(suggestion: string) => {
			if (editingIndex !== null) {
				updateChip(editingIndex, suggestion);
				setEditingIndex(null);
			} else {
				addChip(suggestion);
			}
			setInput("");
			setSuggestionOpen(false);
			onInputChange("");
			inputRef.current?.focus();
		},
		[addChip, editingIndex, onInputChange, updateChip],
	);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (showSuggestions && filteredSuggestions.length > 0) {
				if (e.key === "ArrowDown") {
					e.preventDefault();
					setHighlightedIndex((i) => (i + 1) % filteredSuggestions.length);
					return;
				}
				if (e.key === "ArrowUp") {
					e.preventDefault();
					setHighlightedIndex((i) => (i - 1 + filteredSuggestions.length) % filteredSuggestions.length);
					return;
				}
				if (e.key === "Enter") {
					e.preventDefault();
					selectSuggestion(filteredSuggestions[highlightedIndex]);
					return;
				}
			}

			if (e.key === "Enter" || e.key === ",") {
				e.preventDefault();

				if (editingIndex !== null) {
					if (input.trim()) {
						updateChip(editingIndex, input);
					}
					setEditingIndex(null);
					setInput("");
				} else if (input.trim()) {
					addChip(input);
					setInput("");
				}
			} else if (e.key === "Escape") {
				if (showSuggestions) {
					setSuggestionOpen(false);
				}
				if (editingIndex !== null) {
					setEditingIndex(null);
					setInput("");
				}
			}
		},
		[
			showSuggestions,
			filteredSuggestions,
			highlightedIndex,
			selectSuggestion,
			input,
			addChip,
			editingIndex,
			updateChip,
		],
	);

	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			{chips.length > 0 && (
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={chips} strategy={horizontalListSortingStrategy}>
						<div className="flex flex-wrap gap-1.5">
							{chips.map((chip, idx) => (
								<ChipItem
									key={`${chip}-${idx}`}
									id={chip}
									chip={chip}
									index={idx}
									isEditing={editingIndex === idx}
									onEdit={handleEdit}
									onRemove={removeChip}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}

			<div className="flex flex-col gap-2">
				<div className="relative">
					<Input
						ref={inputRef}
						type="text"
						value={input}
						autoComplete="off"
						aria-label={editingIndex !== null ? "Edit keyword" : "Add keyword"}
						aria-autocomplete="list"
						aria-expanded={showSuggestions}
						placeholder={editingIndex !== null ? "Editing keyword..." : "Add a keyword..."}
						onKeyDown={handleKeyDown}
						onChange={handleInputChange}
						onFocus={() => setSuggestionOpen(true)}
						onBlur={() => {
							setTimeout(() => setSuggestionOpen(false), 150);
						}}
					/>
					{showSuggestions && (
						<div
							ref={listRef}
							role="listbox"
							className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
							onMouseDown={(e) => e.preventDefault()}
						>
							{filteredSuggestions.length > 0 ? (
								filteredSuggestions.map((suggestion, idx) => (
									<button
										key={suggestion}
										type="button"
										role="option"
										aria-selected={idx === highlightedIndex}
										className={cn(
											"flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm outline-hidden hover:bg-accent hover:text-accent-foreground",
											idx === highlightedIndex && "bg-accent text-accent-foreground",
										)}
										onMouseDown={(e) => {
											e.preventDefault();
											selectSuggestion(suggestion);
										}}
										onMouseEnter={() => setHighlightedIndex(idx)}
									>
										{suggestion}
									</button>
								))
							) : (
								<div className="px-3 py-2 text-muted-foreground text-sm">
									<Trans>No matches. Type to search or press Enter to add.</Trans>
								</div>
							)}
						</div>
					)}
				</div>
				<p className="text-muted-foreground text-xs">
					<Trans>
						Press <Kbd>{RETURN_KEY}</Kbd> or <Kbd>{COMMA_KEY}</Kbd> to add or save the current keyword.
					</Trans>
				</p>
			</div>
		</div>
	);
}
