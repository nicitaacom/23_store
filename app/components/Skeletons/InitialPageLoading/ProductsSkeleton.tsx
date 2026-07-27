import "react-loading-skeleton/dist/skeleton.css"
import Skeleton from "react-loading-skeleton"
import { v4 as uuidv4 } from "uuid"

// http://localhost:6006/?path=/story/foundations-skeletons--page-loading
export function ProductsSkeleton() {
  return (
    <section className="flex flex-col gap-y-8 py-12 h-auto max-[1800px]:max-w-[80vw] w-[100vw] max-w-[1442px] overflow-hidden mx-auto">
      {Array(4)
        .fill(0)
        .map(() => {
          const uuid = uuidv4()
          return (
            <div key={uuid}>
              {/* max-width:768px */}

              <article className="flex tablet:hidden flex-col gap-y-2">
                {/* Image */}
                <Skeleton
                  style={{
                    display: "flex",
                    maxWidth: "1800px",
                    width: "100vw",
                    height: "300px",
                  }}
                  duration={2}
                  containerClassName="flex w-full"
                  baseColor="hsl(0deg 0% 7%)"
                  highlightColor="hsl(0deg 0% 16%)"
                />

                <div className="flex tablet:hidden flex-col gap-y-4">
                  <div className="flex flex-row gap-x-2 justify-between w-full h-full">
                    {/* Ttile */}
                    <Skeleton
                      style={{ display: "flex", height: "42px" }}
                      duration={2}
                      containerClassName="flex w-[80%] h-fit"
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                    {/* Price */}
                    <Skeleton
                      style={{ display: "flex", height: "42px" }}
                      duration={2}
                      containerClassName="flex w-[20%] h-fit"
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                  </div>
                  <div className="flex flex-col gap-y-2 w-full h-full">
                    {/* description */}
                    <Skeleton
                      style={{ display: "flex", height: "20px" }}
                      duration={2}
                      containerClassName="flex w-[60%] mx-auto"
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                    {/* price */}
                    <Skeleton
                      style={{ display: "flex", height: "20px" }}
                      duration={2}
                      containerClassName="flex w-[30%] mx-auto"
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                  </div>
                  <div className="flex flex-row gap-x-2 mx-auto">
                    {/* Green outline + button */}
                    <div className="flex flex-col justify-between">
                      <Skeleton
                        style={{ display: "flex", height: "2px" }}
                        duration={2}
                        containerClassName="flex h-[2px]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(118deg 80% 78%)"
                      />
                      <div className="flex flex-row justify-between">
                        <Skeleton
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                          duration={1}
                          containerClassName="flex"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(118deg 80% 78%)"
                        />
                        <Skeleton
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                          direction="rtl"
                          duration={1}
                          containerClassName="flex"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(118deg 80% 78%)"
                        />
                      </div>
                      <Skeleton
                        style={{ display: "flex", height: "2px", rotate: "180deg" }}
                        duration={2}
                        containerClassName="flex w-[50px]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(118deg 80% 78%)"
                      />
                    </div>
                    {/* Red outline + button */}
                    <div className="flex flex-col justify-between">
                      <Skeleton
                        style={{ display: "flex", height: "2px" }}
                        duration={2}
                        containerClassName="flex h-[2px]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 80% 72%)"
                      />
                      <div className="flex flex-row justify-between">
                        <Skeleton
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                          duration={1}
                          containerClassName="flex"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                        <Skeleton
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                          direction="rtl"
                          duration={1}
                          containerClassName="flex"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                      </div>
                      <Skeleton
                        style={{ display: "flex", height: "2px", rotate: "180deg" }}
                        duration={2}
                        containerClassName="flex w-[50px]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 80% 72%)"
                      />
                    </div>
                    {/* Red outline Clear button */}
                    <div className="flex flex-col justify-between">
                      <Skeleton
                        style={{ display: "flex", width: "115px", height: "2px" }}
                        duration={2}
                        containerClassName="flex h-[2px] w-[115px]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 80% 72%)"
                      />
                      <div className="flex flex-row justify-between">
                        <Skeleton
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                          duration={1}
                          containerClassName="flex"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                        <Skeleton
                          style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                          direction="rtl"
                          duration={1}
                          containerClassName="flex"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                      </div>
                      <Skeleton
                        style={{ display: "flex", width: "115px", height: "2px", rotate: "180deg" }}
                        duration={2}
                        containerClassName="flex w-[115px]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 80% 72%)"
                      />
                    </div>
                  </div>
                </div>
              </article>

              {/* min-width:768px */}

              <div className="hidden tablet:flex flex-row gap-x-2 h-[300px] tablet:h-[175px] laptop:h-[200px] overflow-hidden">
                {/* Image */}
                <Skeleton
                  style={{
                    display: "flex",
                    maxWidth: "1800px",
                    width: "100vw",
                    height: "300px",
                  }}
                  duration={2}
                  containerClassName="flex w-full tablet:w-[33%] mb-1"
                  baseColor="hsl(0deg 0% 7%)"
                  highlightColor="hsl(0deg 0% 16%)"
                />

                <div className="flex-col justify-between w-full h-full hidden tablet:flex">
                  <div className="flex flex-row gap-x-2 justify-between w-full h-full">
                    {/* Title + description (on stock omitted) */}
                    <div className="flex flex-col gap-y-2 w-full">
                      <Skeleton
                        style={{ display: "flex", height: "28px" }}
                        duration={2}
                        containerClassName="flex w-[80%]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 0% 16%)"
                      />
                      <Skeleton
                        style={{ display: "flex", height: "20px" }}
                        duration={2}
                        containerClassName="flex w-[30%]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 0% 16%)"
                      />
                    </div>
                    {/* Price */}
                    <Skeleton
                      style={{ display: "flex", height: "28px" }}
                      duration={2}
                      containerClassName="flex w-[20%]"
                      baseColor="hsl(0deg 0% 7%)"
                      highlightColor="hsl(0deg 0% 16%)"
                    />
                  </div>
                  <div className="flex flex-row gap-x-2 justify-between w-full h-full max-h-[50px] mb-1">
                    {/* quantity + subTotal */}
                    <div className="flex flex-col justify-between w-[20%] h-full">
                      <Skeleton
                        style={{ display: "flex", height: "20px" }}
                        duration={2}
                        containerClassName="flex w-full"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 0% 16%)"
                      />
                      <Skeleton
                        style={{ display: "flex", height: "20px" }}
                        duration={2}
                        containerClassName="flex items-end w-[90%]"
                        baseColor="hsl(0deg 0% 7%)"
                        highlightColor="hsl(0deg 0% 16%)"
                      />
                    </div>
                    <div className="flex flex-row gap-x-2">
                      {/* Green outline + button */}
                      <div className="flex flex-col justify-between">
                        <Skeleton
                          style={{ display: "flex", height: "2px" }}
                          duration={2}
                          containerClassName="flex h-[2px]"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(118deg 80% 78%)"
                        />
                        <div className="flex flex-row justify-between">
                          <Skeleton
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                            duration={1}
                            containerClassName="flex"
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(118deg 80% 78%)"
                          />
                          <Skeleton
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                            direction="rtl"
                            duration={1}
                            containerClassName="flex"
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(118deg 80% 78%)"
                          />
                        </div>
                        <Skeleton
                          style={{ display: "flex", height: "2px", rotate: "180deg" }}
                          duration={2}
                          containerClassName="flex w-[50px]"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(118deg 80% 78%)"
                        />
                      </div>
                      {/* Red outline + button */}
                      <div className="flex flex-col justify-between">
                        <Skeleton
                          style={{ display: "flex", height: "2px" }}
                          duration={2}
                          containerClassName="flex h-[2px]"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                        <div className="flex flex-row justify-between">
                          <Skeleton
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                            duration={1}
                            containerClassName="flex"
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(0deg 80% 72%)"
                          />
                          <Skeleton
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                            direction="rtl"
                            duration={1}
                            containerClassName="flex"
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(0deg 80% 72%)"
                          />
                        </div>
                        <Skeleton
                          style={{ display: "flex", height: "2px", rotate: "180deg" }}
                          duration={2}
                          containerClassName="flex w-[50px]"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                      </div>
                      {/* Red outline Clear button */}
                      <div className="flex flex-col justify-between">
                        <Skeleton
                          style={{ display: "flex", width: "115px", height: "2px" }}
                          duration={2}
                          containerClassName="flex h-[2px] w-[115px]"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                        <div className="flex flex-row justify-between">
                          <Skeleton
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "180deg" }}
                            duration={1}
                            containerClassName="flex"
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(0deg 80% 72%)"
                          />
                          <Skeleton
                            style={{ display: "flex", width: "2px", height: "50px", rotate: "360deg" }}
                            direction="rtl"
                            duration={1}
                            containerClassName="flex"
                            baseColor="hsl(0deg 0% 7%)"
                            highlightColor="hsl(0deg 80% 72%)"
                          />
                        </div>
                        <Skeleton
                          style={{ display: "flex", width: "115px", height: "2px", rotate: "180deg" }}
                          duration={2}
                          containerClassName="flex w-[115px]"
                          baseColor="hsl(0deg 0% 7%)"
                          highlightColor="hsl(0deg 80% 72%)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
    </section>
  )
}
