import { Leaf } from "../components/icons/Leaf";

export default function Goals() {
  return (
    <div className="relative h-full overflow-y-auto">
      <div className="p-8 max-w-[1100px] mx-auto flex flex-col items-center justify-center min-h-full text-center">
        <Leaf size={80} rotate={-12} className="mb-6" opacity={0.3} />
        <h1 className="font-serif text-[40px] text-qz-primary font-medium mb-3">
          我的目标
        </h1>
        <p className="font-serif italic text-[15px] text-qz-text-muted mb-6">
          千里之行，始于栖叶
        </p>
        <p className="text-[13px] text-qz-text-muted">敬请期待</p>
      </div>
    </div>
  );
}
