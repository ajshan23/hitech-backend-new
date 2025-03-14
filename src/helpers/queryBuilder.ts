export const buildSearchQuery = (
  searchTerm: string,
  filters: Record<string, string>
) => {
  const query: any = {
    $or: [
      { customerName: { $regex: searchTerm, $options: "i" } },
      { phoneNumber: { $regex: searchTerm, $options: "i" } },
      { jobCardNumber: { $regex: searchTerm, $options: "i" } },
      { DealerName: { $regex: searchTerm, $options: "i" } },
      { Make: { $regex: searchTerm, $options: "i" } },
      { SrNo: { $regex: searchTerm, $options: "i" } },
    ],
  };

  // Add numeric search if searchTerm is a number
  if (!isNaN(Number(searchTerm))) {
    const searchValue = Number(searchTerm);
    query.$or.push(
      { HP: searchValue },
      { KVA: searchValue },
      { RPM: searchValue }
    );
  }

  // Add filters
  if (filters.warranty !== undefined) {
    query.warranty = filters.warranty === "true";
  }
  if (filters.returned !== undefined) {
    query.jobCardStatus = "Returned";
  }
  if (filters.pending !== undefined) {
    query.jobCardStatus = "Pending";
  }
  if (filters.completed !== undefined) {
    query.jobCardStatus = "Completed";
  }
  if (filters.billed !== undefined) {
    query.jobCardStatus = "Billed";
  }

  return query;
};
