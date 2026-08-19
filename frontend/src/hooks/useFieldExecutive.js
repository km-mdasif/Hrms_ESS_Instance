import { useCallback, useState } from "react";
import { API_BASE_URL } from "../config";

const useFieldExecutive = () => {
  const [fieldExecutiveList, setFieldExecutiveList] = useState([]);
  const [recentFieldExecutive, setRecentFieldExecutive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token") || "";
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    };
  }, []);

  const fetchFieldExecutiveList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/field-executive/list`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Unable to load field executive records");
      }
      const data = await response.json();
      const list = Array.isArray(data?.records)
        ? data.records
        : Array.isArray(data)
        ? data
        : [];
      setFieldExecutiveList(list);
      return list;
    } catch (err) {
      const message = err?.message || "Failed to fetch field executive records";
      setError(message);
      setFieldExecutiveList([]);
      console.error("Field executive fetch failed:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchRecentFieldExecutiveHistory = useCallback(
    async (employeeCode) => {
      const code = String(employeeCode || "").trim();
      if (!code) {
        setRecentFieldExecutive([]);
        return [];
      }

      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/field-executive/employee/${encodeURIComponent(code)}`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok) {
          setRecentFieldExecutive([]);
          return [];
        }

        const data = await response.json();
        const records = Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data)
          ? data
          : [];
        const sortedRecords = [...records].sort((a, b) => {
          const timeA = new Date(
            a?.visitDateTime || a?.createdAt || a?.created_at || 0
          ).getTime();
          const timeB = new Date(
            b?.visitDateTime || b?.createdAt || b?.created_at || 0
          ).getTime();
          return timeB - timeA;
        });

        const recent = sortedRecords.slice(0, 5);
        setRecentFieldExecutive(recent);
        return recent;
      } catch (err) {
        console.error("Fetch recent field executive history failed:", err);
        setRecentFieldExecutive([]);
        return [];
      }
    },
    [getAuthHeaders]
  );

  const submitFieldVisit = useCallback(
    async (formData, employeeSelfieBlob, clientSelfieBlob, documentFile) => {
      setLoading(true);
      setError(null);
      try {
        if (!formData.employeeCode || !formData.natureOfWork || !formData.clientName) {
          throw new Error(
            "Employee code, nature of work, and client name are required."
          );
        }

        if (!employeeSelfieBlob || !clientSelfieBlob) {
          throw new Error("Both employee and client selfies are required.");
        }

        if (!formData.latitude || !formData.longitude) {
          throw new Error(
            "Location coordinates are required. Please choose a geofence or allow location access."
          );
        }

        const body = new FormData();
        body.append("employeeCode", formData.employeeCode);
        body.append("employeeName", formData.employeeName || "");
        body.append("natureOfWork", formData.natureOfWork);
        body.append(
          "visitDateTime",
          formData.visitDateTime || new Date().toISOString().slice(0, 16)
        );
        body.append("visitType", formData.visitType || "checkin");
        body.append("clientName", formData.clientName);
        body.append("latitude", String(formData.latitude));
        body.append("longitude", String(formData.longitude));
        body.append("remarks", formData.remarks || "");
        body.append("employeeSelfie", employeeSelfieBlob);
        body.append("clientSelfie", clientSelfieBlob);
        if (documentFile) body.append("document", documentFile);

        const response = await fetch(`${API_BASE_URL}/field-executive/onsite`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const backendMessage =
            data?.error || data?.message || "Unable to save onsite field visit";
          throw new Error(backendMessage);
        }

        // Refresh the list after successful save
        await fetchFieldExecutiveList();

        return {
          success: true,
          message: data?.message || "Field executive onsite entry saved successfully.",
          visitId: data?.visitId,
        };
      } catch (err) {
        const message = err?.message || "Unable to save field executive record.";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchFieldExecutiveList]
  );

  const fetchFieldExecutiveReport = useCallback(
    async (fromDate, toDate, location = "") => {
      setLoading(true);
      setError(null);
      try {
        if (!fromDate || !toDate) {
          throw new Error("Please select both from-date and to-date.");
        }

        const response = await fetch(
          `${API_BASE_URL}/field-executive/report?fromDate=${fromDate}&toDate=${toDate}&location=${
            location || ""
          }`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok) {
          throw new Error("Report fetch failed");
        }
        const data = await response.json();
        const list = Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data)
          ? data
          : [];
        setFieldExecutiveList(list);
        return list;
      } catch (err) {
        const message = err?.message || "Failed to load field executive report.";
        setError(message);
        setFieldExecutiveList([]);
        console.error("Field executive report fetch failed:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  return {
    fieldExecutiveList,
    recentFieldExecutive,
    loading,
    error,
    fetchFieldExecutiveList,
    fetchRecentFieldExecutiveHistory,
    submitFieldVisit,
    fetchFieldExecutiveReport,
  };
};

export default useFieldExecutive;
