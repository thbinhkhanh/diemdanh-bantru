export function useCheckAdminAccess(expectedClassId) {
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    const account = localStorage.getItem("account");

    if (isAdmin) {
      // ✅ Admin được phép truy cập bất kỳ lớp nào
      return;
    }

    // ❌ Không phải admin → chỉ cho vào lớp khớp account
    if (!account || account !== expectedClassId.toUpperCase()) {
      navigate(`/${expectedClassId}`, {
        state: { redirectTo: window.location.pathname },
      });
    }
  }, [expectedClassId, navigate]);
}
