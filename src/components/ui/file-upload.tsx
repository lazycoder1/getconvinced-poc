"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface FileUploadProps {
    accept?: string;
    maxSize?: number; // in bytes
    onFileSelect: (file: File) => void;
    onFileRemove?: () => void;
    placeholder?: string;
    description?: string;
    disabled?: boolean;
    showPreview?: boolean;
    className?: string;
}

export function FileUpload({
    accept = ".md,.markdown,.txt",
    maxSize = 5 * 1024 * 1024, // 5MB
    onFileSelect,
    onFileRemove,
    placeholder = "Choose a file or drag it here",
    description = "Upload markdown files up to 5MB",
    disabled = false,
    showPreview = true,
    className = "",
}: FileUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const validateFile = (file: File): string | null => {
        // Check file type
        const allowedTypes = accept.split(",").map((type) => type.trim());
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
        const mimeType = file.type.toLowerCase();

        const isValidType = allowedTypes.some((type) => {
            if (type.startsWith(".")) {
                return fileExtension === type.toLowerCase();
            }
            return mimeType === type.toLowerCase();
        });

        if (!isValidType) {
            return `Invalid file type. Allowed: ${accept}`;
        }

        // Check file size
        if (file.size > maxSize) {
            const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
            return `File too large. Maximum size: ${maxSizeMB}MB`;
        }

        return null;
    };

    const handleFileSelect = useCallback(
        (file: File) => {
            const validationError = validateFile(file);

            if (validationError) {
                setError(validationError);
                return;
            }

            setError(null);
            setSelectedFile(file);
            onFileSelect(file);
        },
        [onFileSelect, validateFile]
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) {
                setIsDragOver(true);
            }
        },
        [disabled]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);

            if (disabled) return;

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        },
        [disabled, handleFileSelect]
    );

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleFileSelect(files[0]);
            }
        },
        [handleFileSelect]
    );

    const removeFile = useCallback(() => {
        setSelectedFile(null);
        setError(null);
        if (onFileRemove) {
            onFileRemove();
        }
    }, [onFileRemove]);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Upload Area */}
            <Card
                className={`border-2 border-dashed transition-colors ${
                    isDragOver ? "border-blue-500 bg-blue-50" : error ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-gray-400"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <CardContent className="p-6">
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            {isLoading ? (
                                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                            ) : (
                                <Upload className={`h-8 w-8 ${error ? "text-red-400" : "text-gray-400"}`} />
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">{placeholder}</p>
                            <p className="text-xs text-gray-500">{description}</p>
                        </div>

                        <div className="mt-4">
                            <input
                                type="file"
                                accept={accept}
                                onChange={handleFileInputChange}
                                disabled={disabled || isLoading}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload">
                                <Button variant="outline" disabled={disabled || isLoading} className="cursor-pointer" asChild>
                                    <span>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Choose File
                                    </span>
                                </Button>
                            </label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
                <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Selected File Display */}
            {selectedFile && (
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                                    <FileText className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
                                    <p className="text-xs text-green-600">
                                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <Button
                                    onClick={removeFile}
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-100"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* File Type Info */}
            <div className="text-xs text-gray-500 text-center">
                <p>Supported formats: {accept.replace(/\./g, "").toUpperCase()}</p>
                <p>Maximum file size: {formatFileSize(maxSize)}</p>
            </div>
        </div>
    );
}
