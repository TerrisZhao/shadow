"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Checkbox } from "@heroui/checkbox";
import { Plus, Edit, Copy, Trash2, FileText, Calendar } from "lucide-react";
import { addToast } from "@heroui/toast";

import { title } from "@/components/primitives";

interface Resume {
  id: number;
  name: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ResumeListPage() {
  const router = useRouter();
  const {
    isOpen: isNewOpen,
    onOpen: onNewOpen,
    onClose: onNewClose,
  } = useDisclosure();
  const {
    isOpen: isBatchOpen,
    onOpen: onBatchOpen,
    onClose: onBatchClose,
  } = useDisclosure();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newResumeName, setNewResumeName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedResumes, setSelectedResumes] = useState<Set<number>>(
    new Set(),
  );

  // Batch update fields
  const [batchPhone, setBatchPhone] = useState("");
  const [batchEmail, setBatchEmail] = useState("");
  const [batchLocation, setBatchLocation] = useState("");
  const [batchLinkedin, setBatchLinkedin] = useState("");
  const [batchGithub, setBatchGithub] = useState("");
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // Fetch resumes
  const fetchResumes = async () => {
    try {
      const response = await fetch("/api/resumes");
      const data = await response.json();

      if (response.ok) {
        setResumes(data.resumes);
      } else {
        addToast({
          title: data.error || "Failed to fetch resumes",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
      addToast({
        title: "Failed to fetch resumes",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchResumes();
  }, []);

  // Create new resume
  const handleCreateResume = async () => {
    if (!newResumeName.trim()) {
      addToast({
        title: "Please enter a resume name",
        color: "warning",
      });

      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newResumeName.trim(),
          data: {},
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          title: "Resume created successfully",
          color: "success",
        });
        setNewResumeName("");
        onNewClose();
        // Navigate to edit page
        router.push(`/resume/${data.resume.id}`);
      } else {
        addToast({
          title: data.error || "Failed to create resume",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error creating resume:", error);
      addToast({
        title: "Failed to create resume",
        color: "danger",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Duplicate resume
  const handleDuplicate = async (resumeId: number) => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}/duplicate`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          title: "Resume duplicated successfully",
          color: "success",
        });
        void fetchResumes();
      } else {
        addToast({
          title: data.error || "Failed to duplicate resume",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error duplicating resume:", error);
      addToast({
        title: "Failed to duplicate resume",
        color: "danger",
      });
    }
  };

  // Delete resume
  const handleDelete = async (resumeId: number) => {
    if (!confirm("Are you sure you want to delete this resume?")) {
      return;
    }

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        addToast({
          title: "Resume deleted successfully",
          color: "success",
        });
        void fetchResumes();
        setSelectedResumes((prev) => {
          const newSet = new Set(prev);

          newSet.delete(resumeId);

          return newSet;
        });
      } else {
        const data = await response.json();

        addToast({
          title: data.error || "Failed to delete resume",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
      addToast({
        title: "Failed to delete resume",
        color: "danger",
      });
    }
  };

  // Toggle selection
  const handleToggleSelection = (resumeId: number) => {
    setSelectedResumes((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(resumeId)) {
        newSet.delete(resumeId);
      } else {
        newSet.add(resumeId);
      }

      return newSet;
    });
  };

  // Select all
  const handleSelectAll = () => {
    if (selectedResumes.size === resumes.length) {
      setSelectedResumes(new Set());
    } else {
      setSelectedResumes(new Set(resumes.map((r) => r.id)));
    }
  };

  // Batch update
  const handleBatchUpdate = async () => {
    if (selectedResumes.size === 0) {
      addToast({
        title: "Please select at least one resume",
        color: "warning",
      });

      return;
    }

    const updates: any = {};

    if (batchPhone) updates.phone = batchPhone;
    if (batchEmail) updates.email = batchEmail;
    if (batchLocation) updates.location = batchLocation;
    if (batchLinkedin) updates.linkedin = batchLinkedin;
    if (batchGithub) updates.github = batchGithub;

    if (Object.keys(updates).length === 0) {
      addToast({
        title: "Please enter at least one field to update",
        color: "warning",
      });

      return;
    }

    setIsBatchUpdating(true);
    try {
      const response = await fetch("/api/resumes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeIds: Array.from(selectedResumes),
          updates,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          title: `Updated ${data.updated.length} resume(s) successfully`,
          color: "success",
        });
        setBatchPhone("");
        setBatchEmail("");
        setBatchLocation("");
        setBatchLinkedin("");
        setBatchGithub("");
        onBatchClose();
        void fetchResumes();
      } else {
        addToast({
          title: data.error || "Failed to batch update resumes",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Error batch updating resumes:", error);
      addToast({
        title: "Failed to batch update resumes",
        color: "danger",
      });
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className={title()}>My Resumes</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <h1 className={title()}>My Resumes</h1>
        <div className="flex gap-2">
          {selectedResumes.size > 0 && (
            <Button color="secondary" variant="flat" onPress={onBatchOpen}>
              Batch Update ({selectedResumes.size})
            </Button>
          )}
          <Button
            color="primary"
            startContent={<Plus size={18} />}
            onPress={onNewOpen}
          >
            New Resume
          </Button>
        </div>
      </div>

      {resumes.length === 0 ? (
        <Card className="border-none shadow-none">
          <CardBody className="text-center py-12">
            <FileText className="mx-auto mb-4 text-default-400" size={128} />
            <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
            <p className="text-default-500 mb-4">
              Create your first resume to get started
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <Table
              aria-label="Resumes table"
              classNames={{
                wrapper: "border-none shadow-none",
                th: "border-none",
                td: "border-none",
              }}
            >
              <TableHeader>
                <TableColumn>
                  <Checkbox
                    isSelected={
                      selectedResumes.size === resumes.length &&
                      resumes.length > 0
                    }
                    onValueChange={handleSelectAll}
                  />
                </TableColumn>
                <TableColumn>NAME</TableColumn>
                <TableColumn>CONTACT INFO</TableColumn>
                <TableColumn>LAST UPDATED</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {resumes.map((resume) => (
                  <TableRow key={resume.id} className="border-none">
                    <TableCell className="border-none">
                      <Checkbox
                        isSelected={selectedResumes.has(resume.id)}
                        onValueChange={() => handleToggleSelection(resume.id)}
                      />
                    </TableCell>
                    <TableCell className="border-none">
                      <div>
                        <div className="font-semibold">{resume.name}</div>
                        {resume.fullName && (
                          <div className="text-sm text-default-500">
                            {resume.fullName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-none">
                      <div className="space-y-1">
                        {resume.email && (
                          <div className="text-sm">{resume.email}</div>
                        )}
                        {resume.phone && (
                          <div className="text-sm text-default-500">
                            {resume.phone}
                          </div>
                        )}
                        {resume.location && (
                          <div className="text-sm text-default-500">
                            {resume.location}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-none">
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <Calendar size={14} />
                        {formatDate(resume.updatedAt)}
                      </div>
                    </TableCell>
                    <TableCell className="border-none">
                      <div className="flex gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => router.push(`/resume/${resume.id}`)}
                        >
                          <Edit size={18} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleDuplicate(resume.id)}
                        >
                          <Copy size={18} />
                        </Button>
                        <Button
                          isIconOnly
                          color="danger"
                          size="sm"
                          variant="light"
                          onPress={() => handleDelete(resume.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* New Resume Modal */}
      <Modal isOpen={isNewOpen} onClose={onNewClose}>
        <ModalContent>
          <ModalHeader>Create New Resume</ModalHeader>
          <ModalBody>
            <Input
              label="Resume Name"
              placeholder="e.g., Software Engineer Resume"
              value={newResumeName}
              onChange={(e) => setNewResumeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleCreateResume();
                }
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onNewClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={isCreating}
              onPress={handleCreateResume}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Batch Update Modal */}
      <Modal isOpen={isBatchOpen} size="2xl" onClose={onBatchClose}>
        <ModalContent>
          <ModalHeader>
            Batch Update ({selectedResumes.size} selected)
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-500 mb-4">
              Update contact information for all selected resumes. Leave fields
              empty to keep existing values.
            </p>
            <div className="space-y-4">
              <Input
                label="Phone"
                placeholder="+1 (555) 123-4567"
                value={batchPhone}
                onChange={(e) => setBatchPhone(e.target.value)}
              />
              <Input
                label="Email"
                placeholder="john.doe@example.com"
                type="email"
                value={batchEmail}
                onChange={(e) => setBatchEmail(e.target.value)}
              />
              <Input
                label="Location"
                placeholder="San Francisco, CA"
                value={batchLocation}
                onChange={(e) => setBatchLocation(e.target.value)}
              />
              <Input
                label="LinkedIn"
                placeholder="linkedin.com/in/johndoe"
                value={batchLinkedin}
                onChange={(e) => setBatchLinkedin(e.target.value)}
              />
              <Input
                label="GitHub"
                placeholder="github.com/johndoe"
                value={batchGithub}
                onChange={(e) => setBatchGithub(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onBatchClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={isBatchUpdating}
              onPress={handleBatchUpdate}
            >
              Update All
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
