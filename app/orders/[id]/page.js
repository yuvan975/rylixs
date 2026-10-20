import Orders from "@/components/Orders";
export default async function Page({ params }) {
  params = await params;
  return <Orders id={params.id} />;
}
